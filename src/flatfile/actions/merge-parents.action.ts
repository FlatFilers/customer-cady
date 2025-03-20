import { jobHandler } from "@flatfile/plugin-job-handler";
import api, { Flatfile } from "@flatfile/api";

// Define the class for parent information
class ParentInfo {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;

  constructor(firstName: string = '', lastName: string = '', email: string = '', mobile: string = '') {
    this.firstName = firstName.trim();
    this.lastName = lastName.trim();
    this.email = email.trim();
    this.mobile = mobile.trim();
  }

  // Check if all fields are empty
  isEmpty(): boolean {
    return !this.firstName && !this.lastName && !this.email && !this.mobile;
  }

  // Check if first and last name match another parent
  hasSameName(other: ParentInfo): boolean {
    return this.firstName === other.firstName && this.lastName === other.lastName;
  }

  // Update fields if either the object is empty or names match
  update(other: ParentInfo): boolean {
    if (!other.isEmpty() && (this.isEmpty() || this.hasSameName(other))) {
      if (other.firstName.trim()) this.firstName = other.firstName;
      if (other.lastName.trim()) this.lastName = other.lastName;
      if (other.email.trim()) this.email = other.email;
      if (other.mobile.trim()) this.mobile = other.mobile;
      return true;
    }
    return false;
  }

  // Helper method to create from record values
  static fromRecord(record: Flatfile.RecordWithLinks, prefix: string = ''): ParentInfo {
    return new ParentInfo(
      String(record.values[`${prefix}FirstName`]?.value || ''),
      String(record.values[`${prefix}LastName`]?.value || ''),
      String(record.values[`${prefix}Email`]?.value || ''),
      String(record.values[`${prefix}Mobile`]?.value || '')
    );
  }

  // Helper method to update record values
  updateRecord(record: Flatfile.RecordWithLinks, prefix: string = ''): void {
    record.values[`${prefix}FirstName`].value = this.firstName;
    record.values[`${prefix}LastName`].value = this.lastName;
    record.values[`${prefix}Email`].value = this.email;
    record.values[`${prefix}Mobile`].value = this.mobile;
  }
}

export const mergeParentsBlueprint: Flatfile.Action = {
  operation: "merge-parents",
  mode: Flatfile.ActionMode.Foreground,
  label: "↣ Merge Parents",
  description: "Merge duplicate students into a single record, filling Parent 2 fields with Parent 1 values where necessary"
}

export const mergeParentsAction = jobHandler(`*:${mergeParentsBlueprint.operation}`, async (event, tick) => {
  const { workbookId, jobId, environmentId, spaceId, sheetId } = event.context;
  await tick(5, "Identifying duplicate students");

  const { data: { records } } = await api.records.get(sheetId);
  

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

  await tick(25, `Merging records for ${dupeIdCount} duplicated Student ID${dupeIdCount === 1 ? "" : "s"}`);

  const recordIdsToDelete = new Set<string>();
  const recordsToUpdate = new Set<Flatfile.RecordWithLinks>();

  for (const [studentId, recordsForStudentId] of recordsByStudentId) {
    if (recordsForStudentId.length > 1) {
      // Add all but the first record to the set of records to delete
      recordsForStudentId.slice(1).map((r) => r.id).forEach(recordIdsToDelete.add, recordIdsToDelete)

      const masterRecord = recordsForStudentId[0];
      let masterRecordUpdated: boolean = false;

      // Initialize parent objects with the first record's data
      const parentOne = ParentInfo.fromRecord(masterRecord, 'parent');
      const parentTwo = ParentInfo.fromRecord(masterRecord, 'parent2');

      // Process remaining records to build complete parent information
      let parentInfoUpdated = false;
      for (const secondaryRecord of recordsForStudentId.slice(1)) {
        const recordParentOne = ParentInfo.fromRecord(secondaryRecord, 'parent');
        const recordParentTwo = ParentInfo.fromRecord(secondaryRecord, 'parent2');

        // Try to update parentOne first, if that fails try parentTwo
        parentInfoUpdated = parentOne.update(recordParentOne) || 
                            parentTwo.update(recordParentOne) || 
                            parentOne.update(recordParentTwo) || 
                            parentTwo.update(recordParentTwo) || 
                            parentInfoUpdated;
      }

      // Only update master record if parent information was actually changed
      if (parentInfoUpdated) {
        parentOne.updateRecord(masterRecord, 'parent');
        parentTwo.updateRecord(masterRecord, 'parent2');
        masterRecordUpdated = true;
      }

      // Process all secondary records for other fields
      for (const secondaryRecord of recordsForStudentId.slice(1)) {
        // Then handle all other fields in the record
        // This ensures we don't miss any fields that might have important data
        Object.entries(masterRecord.values).forEach(([fieldName, masterField]) => {
          // Skip fields that are parent-related since we already handled those above
          if (fieldName.startsWith('parent') && 
              ['FirstName', 'LastName', 'Email', 'Mobile'].some(suffix => 
                fieldName.endsWith(suffix))) {
            return;
          }

          // Get the corresponding field from the secondary record
          const secondaryField = secondaryRecord.values[fieldName];
          
          // Skip if this field doesn't exist in the secondary record
          if (!secondaryField) return;
          
          // If master record's field is empty (null, undefined, or empty string) but secondary has a value, use it
          // This ensures we preserve any data that exists in secondary records
          if ((!masterField.value || String(masterField.value).trim() === '') && secondaryField.value) {
            masterRecord.values[fieldName].value = secondaryField.value;
            masterRecordUpdated = true;
          }
        });
      }

      // If we made any updates to the master record, add it to the list of records to update
      if (masterRecordUpdated) {
        recordsToUpdate.add(masterRecord);
      }
    }
  }

  await tick(50, `Updating ${recordsToUpdate.size} records and deleting ${recordIdsToDelete.size} records`);

  // Update records
  if (recordsToUpdate.size > 0) {
    await api.records.update(sheetId, Array.from(recordsToUpdate));
  }
  

  // Delete records in chunks of 100
  const recordIdsToDeleteArray = Array.from(recordIdsToDelete);
  const chunkSize = 100;
  const deletePromises = [];

  const chunks = Math.ceil(recordIdsToDelete.size / chunkSize);
  const chunkProgress = Math.floor(45 / chunks);
  let progress = 50;

  for (let i = 0; i < recordIdsToDeleteArray.length; i += chunkSize) {
    const chunk = recordIdsToDeleteArray.slice(i, i + chunkSize);
    deletePromises.push(api.records.delete(sheetId, { ids: chunk }).then(() => {
      progress += chunkProgress;
      return tick(progress, `Deleted ${i + chunk.length} of ${recordIdsToDelete.size} records`);
    }));
  }
  
  await Promise.all(deletePromises);
  
  await tick(100, `Successfully updated ${recordsToUpdate.size} records and deleted ${recordIdsToDelete.size} records`);
});
