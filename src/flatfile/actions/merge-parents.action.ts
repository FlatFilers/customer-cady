import { jobHandler } from "@flatfile/plugin-job-handler";
import api, { Flatfile } from "@flatfile/api";

import { objectsToExcel } from "../../common/objects-to-excel";
import { JobResponse } from "@flatfile/api/api";

export const mergeParentsBlueprint: Flatfile.Action = {
  operation: "merge-parents",
  mode: Flatfile.ActionMode.Foreground,
  label: "↣ Merge Parents",
  description: "Merge duplicate students into a single record, filling Parent 2 fields with Parent 1 values where necessary"
}

const parentFieldTuples = [
  ["parentFirstName", "parent2FirstName"],
  ["parentLastName", "parent2LastName"],
  ["parentEmail", "parent2Email"],
  ["parentMobile", "parent2Mobile"],
]

export const mergeParentsAction = jobHandler(`*:${mergeParentsBlueprint.operation}`, async (event, tick) => {
  const { workbookId, jobId, environmentId, spaceId, sheetId } = event.context;
  await api.jobs.ack(jobId, {
    info: "Identifying duplicate students",
    progress: 5,
  });
  // console.log("Merge Parents Action", { workbookId, jobId, environmentId, spaceId, sheetId });

  const { data: { records } } = await api.records.get(sheetId);
  
  // console.log("Records", records);

  const recordsByStudentId = new Map<string, Flatfile.RecordWithLinks[]>();
  records.forEach((record) => {
    const studentId = record.values.studentId.value as string;
    if (studentId) {
      // Initialize the array indexed on studentId if it doesn't exist
      recordsByStudentId.set(studentId, recordsByStudentId.get(studentId) || []);
      
      // Add the record to the array
      recordsByStudentId.get(studentId).push(record);
    }
  });

  const dupeIdCount = Array.from(recordsByStudentId.values()).filter((a) => a.length > 1).length  

  await api.jobs.ack(jobId, {
    info: `Merging records for ${dupeIdCount} duplicated Student ID${dupeIdCount === 1 ? "" : "s"}`,
    progress: 25,
  });

  console.log(`Merging records for ${dupeIdCount} duplicated Student ID${dupeIdCount === 1 ? "" : "s"}`);

  const recordIdsToDelete = new Set<string>();
  const recordsToUpdate = new Set<Flatfile.RecordWithLinks>();

  for (const [studentId, recordsForStudentId] of recordsByStudentId) {
    if (recordsForStudentId.length > 1) {
      // Add all but the first record to the set of records to delete
      recordsForStudentId.slice(1).map((r) => r.id).forEach(recordIdsToDelete.add, recordIdsToDelete)

      const masterRecord = recordsForStudentId[0];
      let masterRecordUpdated: boolean = false;
      const secondaryRecord = recordsForStudentId[1];

      // Check if ALL parent fields are the same between the records
      const allParentFieldsSame = parentFieldTuples.every(([parentOneFieldName]) => 
        masterRecord.values[parentOneFieldName].value === secondaryRecord.values[parentOneFieldName].value
      );

      // Skip if all parent fields are the same
      if (!allParentFieldsSame) {
        parentFieldTuples.forEach(([parentOneFieldName, parentTwoFieldName]) => {
          masterRecord.values[parentTwoFieldName].value = secondaryRecord.values[parentOneFieldName].value;
        });
        masterRecordUpdated = true;
      }

      if (masterRecordUpdated) {
        recordsToUpdate.add(masterRecord);
      }
    }
  }

  console.log(`Identified ${recordsToUpdate.size} records to update`);
  console.log(`Identified ${recordIdsToDelete.size} records to delete`);

  await api.jobs.ack(jobId, {
    info: `Updating ${recordsToUpdate.size} records and deleting ${recordIdsToDelete.size} records`,
    progress: 50,
  });

  await api.records.update(sheetId, Array.from(recordsToUpdate));
  await api.records.delete(sheetId, { ids: Array.from(recordIdsToDelete) });
  
});
