import { jobHandler } from "@flatfile/plugin-job-handler";
import api, { Flatfile } from "@flatfile/api";

import { objectsToExcel } from "../../common/objects-to-excel";
import { JobResponse } from "@flatfile/api/api";

export const extractStudentsBlueprint: Flatfile.Action = {
  operation: "extract-students",
  mode: Flatfile.ActionMode.Background,
  label: "Extract Students",
  description: "Send student records to webhook"
}

export const extractStudentsAction = jobHandler(`*:${extractStudentsBlueprint.operation}`, async (event, tick) => {
  const { workbookId, jobId, environmentId, spaceId } = event.context;
  
  await api.jobs.ack(jobId, {
    info: "Student records export started",
    progress: 10,
  });

  const { data: sheets } = await api.sheets.list({ workbookId });
  const studentsSheet = sheets.find((sheet) => sheet.slug === "students");

  if (studentsSheet) {
    const { data: { records } } = await api.records.get(studentsSheet.id);

    if (!records || records.length === 0) {
      await api.jobs.ack(jobId, {
        info: "No student records found",
        progress: 100,
      });
      return;
    }

    // Map template names to internal field keys, maintaining desired order
    const fieldKeyMap = {
      "Student Last Name": "studentLastName",
      "Student First Name": "studentFirstName",
      "Full Name": "fullName",
      "Student ID": "studentId",
      "Gender": "gender",
      "Student Email": "studentEmail",
      "Student Mobile": "studentMobile",
      "Homeroom Teacher": "homeroomTeacher",
      "English Teacher": "englishTeacher",
      "PE Teacher": "peTeacher",
      "Grade": "grade",
      "Period": "period",
      "Parent First Name": "parentFirstName",
      "Parent Last Name": "parentLastName",
      "Parent Email": "parentEmail",
      "Parent Mobile": "parentMobile",
      "Parent 2 First Name": "parent2FirstName",
      "Parent 2 Last Name": "parent2LastName",
      "Parent 2 Email": "parent2Email",
      "Parent 2 Mobile": "parent2Mobile",
      "Address1": "address1",
      "Address2": "address2",
      "City": "city",
      "State": "state",
      "Zip": "zip",
      "Room": "room"
    };

    // Transform records to ordered format
    const formattedRecords = records.map((record) => {
      const orderedValues = {};
      Object.keys(fieldKeyMap).forEach(templateField => {
        const key = fieldKeyMap[templateField];
        orderedValues[templateField] = key && record.values[key] 
          ? record.values[key].value 
          : "";
      });
      return orderedValues;
    });

    const tickCallback = async (progress: number, message: string): Promise<JobResponse> => {
      return await tick(Math.min(progress + 25, 100), message);
    } 
    await tick(25, "Starting Excel export");
    try {
      const fileId = await objectsToExcel(formattedRecords, spaceId, environmentId, 'Students', tickCallback);
      console.log("File ID: ", fileId);

      return {
        outcome: {
          heading: 'Success!',
          message:
            'Data was successfully written to Excel file and uploaded. The download should start automatically.',
          next: {
            type: 'files',
            files: [{ fileId }],
          },
        },
      }

    } catch (error) {
      console.error(error);
      throw error;
    }

  } else {
    throw new Error("Students sheet not found");
  }
});
