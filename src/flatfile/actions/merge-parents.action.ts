/**
 * Imports required for handling Flatfile jobs and API interactions
 */
import { jobHandler } from "@flatfile/plugin-job-handler";
import api, { Flatfile } from "@flatfile/api";

/**
 * Class to manage parent information for student records
 * Handles data consistency and merging of parent details
 */
class ParentInfo {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;

  /**
   * Creates a new ParentInfo instance with trimmed values
   * @param firstName - Parent's first name
   * @param lastName - Parent's last name
   * @param email - Parent's email address
   * @param mobile - Parent's mobile number
   */
  constructor(firstName: string = '', lastName: string = '', email: string = '', mobile: string = '') {
    this.firstName = firstName.trim();
    this.lastName = lastName.trim();
    this.email = email.trim();
    this.mobile = mobile.trim();
  }

  /**
   * Checks if all parent information fields are empty
   * @returns boolean indicating if all fields are empty
   */
  isEmpty(): boolean {
    return !this.firstName && !this.lastName && !this.email && !this.mobile;
  }

  /**
   * Compares first and last name with another ParentInfo instance
   * @param other - ParentInfo instance to compare against
   * @returns boolean indicating if names match
   */
  hasSameName(other: ParentInfo): boolean {
    return this.firstName === other.firstName && this.lastName === other.lastName;
  }

  /**
   * Updates fields if either this instance is empty or names match
   * @param other - ParentInfo instance containing potential updates
   * @returns boolean indicating if any updates were made
   */
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

  /**
   * Updates only empty fields with non-empty values from another ParentInfo object
   * Maintains data consistency by updating first and last names together
   * @param other - ParentInfo instance containing potential updates
   * @returns boolean indicating if any updates were made
   */
  updateEmptyFields(other: ParentInfo): boolean {
    let updated = false;
    // Update first and last name together if both are empty in this object
    // and at least one of them has a value in the other object
    if (!this.firstName && !this.lastName && (other.firstName || other.lastName)) {
      this.firstName = other.firstName;
      this.lastName = other.lastName;
      updated = true;
    }
    // Update email independently if empty
    if (!this.email && other.email) {
      this.email = other.email;
      updated = true;
    }
    // Update mobile independently if empty
    if (!this.mobile && other.mobile) {
      this.mobile = other.mobile;
      updated = true;
    }
    return updated;
  }

  /**
   * Creates a ParentInfo instance from a Flatfile record
   * @param record - Flatfile record containing parent information
   * @param prefix - Prefix for the parent fields (e.g., 'parent' or 'parent2')
   * @returns new ParentInfo instance
   */
  static fromRecord(record: Flatfile.RecordWithLinks, prefix: string = ''): ParentInfo {
    return new ParentInfo(
      String(record.values[`${prefix}FirstName`]?.value || ''),
      String(record.values[`${prefix}LastName`]?.value || ''),
      String(record.values[`${prefix}Email`]?.value || ''),
      String(record.values[`${prefix}Mobile`]?.value || '')
    );
  }

  /**
   * Updates a Flatfile record with this ParentInfo's values
   * @param record - Flatfile record to update
   * @param prefix - Prefix for the parent fields (e.g., 'parent' or 'parent2')
   */
  updateRecord(record: Flatfile.RecordWithLinks, prefix: string = ''): void {
    record.values[`${prefix}FirstName`].value = this.firstName;
    record.values[`${prefix}LastName`].value = this.lastName;
    record.values[`${prefix}Email`].value = this.email;
    record.values[`${prefix}Mobile`].value = this.mobile;
  }
}

/**
 * Blueprint definition for the merge-parents action
 * Used to merge duplicate student records and consolidate parent information
 */
export const mergeParentsBlueprint: Flatfile.Action = {
  operation: "merge-parents",
  mode: Flatfile.ActionMode.Foreground,
  label: "↣ Merge Parents",
  description: "Merge duplicate students into a single record, filling Parent 2 fields with Parent 1 values where necessary"
}

/**
 * Action handler for merging parent information across duplicate student records
 * This action:
 * 1. Identifies duplicate student records
 * 2. Merges parent information from duplicate records
 * 3. Updates the master record with consolidated information
 * 4. Deletes duplicate records
 */
export const mergeParentsAction = jobHandler(`*:${mergeParentsBlueprint.operation}`, async (event, tick) => {
  const { workbookId, jobId, environmentId, spaceId, sheetId } = event.context;
  await tick(5, "Identifying duplicate students");

  // Fetch all records from the sheet
  const { data: { records } } = await api.records.get(sheetId);
  
  // Group records by student ID to identify duplicates
  const recordsByStudentId = new Map<string, Flatfile.RecordWithLinks[]>();
  records.forEach((record) => {
    const studentId = record.values.studentId.value as string;
    if (studentId) {
      recordsByStudentId.set(studentId, recordsByStudentId.get(studentId) || []);
      recordsByStudentId.get(studentId).push(record);
    }
  });

  // Count number of students with duplicate records
  const dupeIdCount = Array.from(recordsByStudentId.values()).filter((a) => a.length > 1).length  

  await tick(25, `Merging records for ${dupeIdCount} duplicated Student ID${dupeIdCount === 1 ? "" : "s"}`);

  // Track records to delete and update
  const recordIdsToDelete = new Set<string>();
  const recordsToUpdate = new Set<Flatfile.RecordWithLinks>();

  // Process each set of duplicate records
  for (const [studentId, recordsForStudentId] of recordsByStudentId) {
    if (recordsForStudentId.length > 1) {
      // Mark all but the first record for deletion
      recordsForStudentId.slice(1).map((r) => r.id).forEach(recordIdsToDelete.add, recordIdsToDelete)

      const masterRecord = recordsForStudentId[0];
      let masterRecordUpdated: boolean = false;

      // Initialize parent information from the master record
      const parentOne = ParentInfo.fromRecord(masterRecord, 'parent');
      const parentTwo = ParentInfo.fromRecord(masterRecord, 'parent2');

      // Process remaining records to build complete parent information
      let parentInfoUpdated = false;
      for (const secondaryRecord of recordsForStudentId.slice(1)) {
        const recordParentOne = ParentInfo.fromRecord(secondaryRecord, 'parent');
        const recordParentTwo = ParentInfo.fromRecord(secondaryRecord, 'parent2');

        // Attempt to update parent information in order of priority
        parentInfoUpdated = parentOne.update(recordParentOne) || 
                            parentTwo.update(recordParentOne) || 
                            parentOne.update(recordParentTwo) || 
                            parentTwo.update(recordParentTwo) ||
                            parentOne.updateEmptyFields(recordParentOne) ||
                            parentTwo.updateEmptyFields(recordParentOne) ||
                            parentOne.updateEmptyFields(recordParentTwo) ||
                            parentTwo.updateEmptyFields(recordParentTwo) || 
                            parentInfoUpdated;
      }

      // Update master record if parent information was modified
      if (parentInfoUpdated) {
        parentOne.updateRecord(masterRecord, 'parent');
        parentTwo.updateRecord(masterRecord, 'parent2');
        masterRecordUpdated = true;
      }

      // Process non-parent fields from secondary records
      for (const secondaryRecord of recordsForStudentId.slice(1)) {
        Object.entries(masterRecord.values).forEach(([fieldName, masterField]) => {
          // Skip parent-related fields as they were handled above
          if (fieldName.startsWith('parent') && 
              ['FirstName', 'LastName', 'Email', 'Mobile'].some(suffix => 
                fieldName.endsWith(suffix))) {
            return;
          }

          const secondaryField = secondaryRecord.values[fieldName];
          if (!secondaryField) return;
          
          // Update empty fields in master record with values from secondary records
          if ((!masterField.value || String(masterField.value).trim() === '') && secondaryField.value) {
            masterRecord.values[fieldName].value = secondaryField.value;
            masterRecordUpdated = true;
          }
        });
      }

      // Add updated master record to the update set
      if (masterRecordUpdated) {
        recordsToUpdate.add(masterRecord);
      }
    }
  }

  await tick(50, `Updating ${recordsToUpdate.size} records and deleting ${recordIdsToDelete.size} records`);

  // Update modified records
  if (recordsToUpdate.size > 0) {
    await api.records.update(sheetId, Array.from(recordsToUpdate));
  }
  
  // Delete duplicate records in chunks to handle large datasets efficiently
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
