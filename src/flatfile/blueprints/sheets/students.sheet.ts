import { Flatfile } from "@flatfile/api";
import { mergeParentsBlueprint } from "../../actions/merge-parents.action";

/**
 * Students Sheet Configuration
 * 
 * This sheet defines the structure for student records including:
 * - Basic student information (name, ID, gender)
 * - Contact details (email, mobile)
 * - Academic information (grade, period, homeroom teacher)
 * - Parent/Guardian information (up to 2 parents)
 * - Address information
 * 
 * Required fields:
 * - Student First Name
 * - Student Last Name
 * - Student ID (must be unique)
 * - Full Name (auto-generated)
 * - Homeroom Teacher
 * - Grade
 * - Period
 * - Address 1
 */


export const studentsSheet: Flatfile.SheetConfig = {
  "name": "Students",
  "slug": "students",
  "allowAdditionalFields": true,
  "actions": [mergeParentsBlueprint],
  "fields": [
    {
      "key": "studentLastName",
      "type": "string",
      "label": "Student Last Name",
      "constraints": [
        {
          "type": "required"
        }
      ]
    },
    {
      "key": "studentMiddleName",
      "type": "string",
      "label": "Student Middle Name",
      "constraints": [
      ]
    },
    {
      "key": "studentFirstName",
      "type": "string",
      "label": "Student First Name",
      "constraints": [
        {
          "type": "required"
        }
      ]
    },
    {
      "key": "fullName",
      "type": "string",
      "label": "Full Name",
      "constraints": [
        {
          "type": "required"
        }
      ],
      "metadata": {
        "formula": "studentLastName + ' ' + studentFirstName"
      }
    },
    {
      "key": "studentId",
      "type": "string",
      "label": "Student ID",
      "constraints": [
        {
          "type": "required"
        },
        {
          "type": "unique"
        }
      ]
    },
    {
      "key": "gender",
      "type": "string",
      "label": "Gender",
      "constraints": [
      ]
    },
    {
      "key": "studentEmail",
      "type": "string",
      "label": "Student Email",
      "constraints": [
      ]
    },
    {
      "key": "studentMobile",
      "type": "string",
      "label": "Student Mobile",
      "constraints": [

      ]
    },
    {
      "key": "homeroomTeacher",
      "type": "string",
      "label": "Homeroom Teacher",
      "constraints": [
        {
          "type": "required"
        }
      ]
    },
    {
      "key": "grade",
      "type": "string",
      "label": "Grade",
      "constraints": [
        {
          "type": "required"
        }
      ]
    },
    {
      "key": "period",
      "type": "string",
      "label": "Period",
      "constraints": [
        {
          "type": "required"
        }
      ]
    },
    {
      "key": "parentFirstName",
      "type": "string",
      "label": "Parent First Name",
      "constraints": [

      ]
    },
    {
      "key": "parentLastName",
      "type": "string",
      "label": "Parent Last Name",
      "constraints": [

      ]
    },
    {
      "key": "parentEmail",
      "type": "string",
      "label": "Parent Email",
      "constraints": [

      ]
    },
    {
      "key": "parentMobile",
      "type": "string",
      "label": "Parent Mobile",
      "constraints": [

      ]
    },
    {
      "key": "parent2FirstName",
      "type": "string",
      "label": "Parent 2 First Name",
      "constraints": [

      ]
    },
    {
      "key": "parent2LastName",
      "type": "string",
      "label": "Parent 2 Last Name",
      "constraints": [

      ]
    },
    {
      "key": "parent2Email",
      "type": "string",
      "label": "Parent 2 Email",
      "constraints": [

      ]
    },
    {
      "key": "parent2Mobile",
      "type": "string",
      "label": "Parent 2 Mobile",
      "constraints": [

      ]
    },
    {
      "key": "address1",
      "type": "string",
      "label": "Address 1",
      "constraints": [
        {
          "type": "required"
        }
      ]
    },
    {
      "key": "address2",
      "type": "string",
      "label": "Address 2",
      "constraints": [

      ]
    },
    {
      "key": "city",
      "type": "string",
      "label": "City",
      "constraints": [

      ]
    },
    {
      "key": "state",
      "type": "string",
      "label": "State",
      "constraints": [

      ]
    },
    {
      "key": "zip",
      "type": "string",
      "label": "Zip",
      "constraints": [

      ]
    },
    {
      "key": "room",
      "type": "string",
      "label": "Room",
      "constraints": [
      ]
    }
  ]
}