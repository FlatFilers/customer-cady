import { jobHandler } from "@flatfile/plugin-job-handler";
import api, { Flatfile } from "@flatfile/api";

const HEADER_ROW_INDEX = 1;

// Define the basic action configuration that will appear in the Flatfile UI
const barebonesBlueprint: Flatfile.Action = {
  operation: "populate-missing-fields",                          // Unique identifier for this action
  mode: "foreground",                                            // Action runs in the foreground (user can see progress)
  label: "↪ Populate Missing Fields",                            // Button label in the UI
  description: "Populate missing fields with preceding values",  // Tooltip description
  confirm: true,                                                 // Requires user confirmation before running
  mount: { type: "field" },                                      // Action appears at the field/column level
}

/**
 * Creates a blueprint configuration for populating missing fields in a workbook
 * @param workbookId - The ID of the workbook to target
 * @throws {Error} If workbookId is empty or invalid
 * @returns {Flatfile.ApiActionConfig} The action configuration
 */
export const createPopulateMissingFieldsBlueprint = (workbookId: string): Flatfile.ApiActionConfig => {
  if (!workbookId?.trim()) {
    throw new Error('Invalid workbook ID');
  }
  return {
    targetId: workbookId,
    ...barebonesBlueprint,
  };
};

/**
 * Handles the population of missing fields in a column with the previous non-empty value
 */
export const populateMissingFieldsAction = jobHandler(
  `sheet:${barebonesBlueprint.operation}`,
  async (event, tick) => {
    try {
      // Extract context information from the event
      const { sheetId } = event.context;

      await tick(10, "Starting to process records...");
      
      // Fetch all records from the current sheet
      const { data: { records }} = await api.records.get(sheetId);
      if (!records?.length) {
        await tick(100,"No records found to process");
        return;
      }

      // Get the job details to determine which column we're operating on
      const { data } = await api.jobs.get(event.context.jobId);
      const { params: { columnKey } } = data.subject as Flatfile.JobSubject.Collection;

      if (!columnKey) {
        throw new Error("No column specified for processing");
      }

      // Initialize variable to store the last non-empty value
      let previousValue = undefined;
      let updatedCount = 0;

      // Iterate through records (starting from index 1 to skip header row)
      for (let i = HEADER_ROW_INDEX; i < records.length; i++) {
        const record = records[i];
        const { values } = record;

        // Skip if the column doesn't exist in the record
        if (!values[columnKey]) {
          continue;
        }

        const { [columnKey]: { value: fieldValue } } = values;

        // If current field is empty (undefined, null, or just whitespace)
        if (fieldValue === undefined || fieldValue === null || String(fieldValue).trim() === '') {
          // Fill it with the previous non-empty value
          values[columnKey].value = previousValue;
          updatedCount++;
        } else {
          // If field has a value, store it as the new previous value
          previousValue = fieldValue;
        }

        // Report progress every 10 records
        if (i % 10 === 0) {
          const progress = (i / (records.length - 1))
          const tickValue = Math.round(10 + progress * 80)
          await tick(tickValue,`Processed ${i} of ${records.length - 1} records...`);
        }
      }

      // Update all records in the sheet with the new values
      await api.records.update(sheetId, records);
      await tick(100, `Completed! Updated ${updatedCount} empty fields.`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      await tick(100, `Error: ${errorMessage}`);
      throw error;
    }
  }
);