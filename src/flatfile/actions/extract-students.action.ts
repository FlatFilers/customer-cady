import { jobHandler } from "@flatfile/plugin-job-handler";
import api, { Flatfile } from "@flatfile/api";

export const extractStudentsBlueprint: Flatfile.Action = {
  operation: "extract-students",
  mode: Flatfile.ActionMode.Background,
  label: "Extract Students",
  description: "Send student records to webhook"
}

export const extractStudentsAction = jobHandler(`*:${extractStudentsBlueprint.operation}`, async (event, tick) => {
  const { workbookId, jobId } = event.context;
  const WEBHOOK_URL = "https://webhook.site/c73f2ba6-bee3-407d-8f73-79b6e70e1c38";
  
  await api.jobs.ack(jobId, {
    info: "Student records export started",
    progress: 10,
  });

  const { data: sheets } = await api.sheets.list({ workbookId });
  const studentsSheet = sheets.find((sheet) => sheet.slug === "students");

  if (studentsSheet) {
    const records = await api.records.get(studentsSheet.id);

    if (!records.data.records || records.data.records.length === 0) {
      await api.jobs.ack(jobId, {
        info: "No student records found",
        progress: 100,
      });
      return;
    }

    // Define the order of fields as per template
    const fieldOrder = [
      "studentLastName",
      "studentFirstName", 
      "fullName",
      "studentId",
      "gender",
      "studentEmail",
      "studentMobile",
      "homeroomTeacher",
      "grade",
      "period",
      "parentFirstName",
      "parentLastName",
      "parentEmail",
      "parentMobile",
      "parent2FirstName",
      "parent2LastName",
      "parent2Email",
      "parent2Mobile",
      "address1",
      "address2",
      "city",
      "state",
      "zip",
      "room"
    ];

    // Transform records to ordered format
    const formattedRecords = records.data.records.map((record) => {
      const orderedValues = {};
      fieldOrder.forEach(field => {
        orderedValues[field] = record.values[field].value;
      });
      return orderedValues;
    });

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: formattedRecords,
          totalRecords: formattedRecords.length,
          workbookId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await api.jobs.ack(jobId, {
        info: `Successfully sent ${formattedRecords.length} records to webhook`,
        progress: 100,
      });
    } catch (error) {
      await api.jobs.fail(jobId, {
        info: `Failed to send records to webhook: ${error.message}`
      });
      throw error;
    }
    
    return;
  } else {
    throw new Error("Students sheet not found");
  }
});
