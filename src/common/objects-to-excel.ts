import type { TickFunction } from '@flatfile/plugin-job-handler'
import { logError, logInfo } from '@flatfile/util-common'

import api from '@flatfile/api'
import path from 'path'

import * as R from 'remeda'
import * as XLSX from 'xlsx'
import * as fs from 'fs'



/**
 * The function `objectsToExcel` exports an array of objects to an Excel file, writes it to disk,
 * uploads it to Flatfile, and returns the file ID.
 * @param {any[]} objects - The `objects` parameter in the `objectsToExcel` function is an array of
 * objects that you want to export to an Excel file. These objects will be converted to rows in the
 * Excel sheet during the export process.
 * @param {string} spaceId - The `spaceId` parameter in the `objectsToExcel` function represents the
 * identifier for the space where the Excel file will be uploaded. It is used to specify the
 * destination space within the Flatfile environment where the Excel file will be stored.
 * @param {string} environmentId - The `environmentId` parameter in the `objectsToExcel` function is a
 * string that represents the environment identifier where the Excel file will be uploaded. It is used
 * as part of the configuration when uploading the Excel file to Flatfile.
 * @param {string} [sheetName] - The `sheetName` parameter is an optional parameter that allows you to
 * specify the name of the sheet within the Excel file where the data will be written. If no
 * `sheetName` is provided, the default value 'Sheet1' will be used.
 * @param {TickFunction} [tick] - The `tick` parameter is a function that can be passed to provide
 * progress updates during the Excel export process. It is an optional parameter that can be used to
 * report progress at different stages of the export job. The function takes two arguments: a
 * percentage value indicating the progress and a message describing the current
 * @returns The function `objectsToExcel` is returning a Promise that resolves to a string representing
 * the `fileId` of the Excel file that was uploaded to Flatfile.
 */

export const objectsToExcel = async (objects: any[], spaceId: string, environmentId: string, sheetName?: string, tick?: TickFunction): Promise<string> => {
    try {
    if (tick) await tick(1, 'Starting Excel export job')
    
    sheetName = sheetName || 'Sheet1';
    const timestamp = new Date().toISOString()
    const fileName = `ff-extraction-${timestamp}.xlsx`
    const filePath = path.join('/tmp', fileName)

    const xlsxWorkbook = XLSX.utils.book_new();
    const xlsxWorksheet = XLSX.utils.json_to_sheet(objects);

    XLSX.utils.book_append_sheet(xlsxWorkbook, xlsxWorksheet, sheetName);

    console.log(xlsxWorkbook);

    try {
      XLSX.set_fs(fs)
      XLSX.writeFile(xlsxWorkbook, filePath)

      if (tick) await tick(80, 'Excel file written to disk')

    } catch (_) {
      logError(
        'Extract XLSX',
        'Failed to write file to disk'
      )

      throw new Error('Failed writing the Excel file to disk.')
    }

    if (xlsxWorkbook.SheetNames.length === 0) {
      throw new Error('No data to write to Excel file.')
    }

    let fileId: string
    try {
      const reader = fs.createReadStream(filePath)

      const { data: file } = await api.files.upload(reader, {
        spaceId,
        environmentId,
        mode: 'export',
      })
      fileId = file.id

      if (tick) await tick(90, 'Excel file uploaded to Flatfile')

      reader.close()

      await fs.promises.unlink(filePath)

    } catch (error) {
      logError('Extract XLSX', 'Failed to upload file')

      throw new Error('Failed uploading Excel file to Flatfile.' + error.message)
    }
    return fileId;

  } catch (error) {
    logError('@flatfile/plugin-export-workbook', error)

    throw new Error((error as Error).message)
  }
}