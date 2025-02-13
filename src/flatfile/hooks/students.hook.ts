import { FlatfileRecord, recordHook } from "@flatfile/plugin-record-hook";
import { PhoneNumberUtil, PhoneNumberFormat } from 'google-libphonenumber';

const phoneUtil = PhoneNumberUtil.getInstance();

export const studentsHook = recordHook("students", (record: FlatfileRecord) => {
  validatePhoneNumber(record, "parentMobile");
  
  return record;
}); 

const validatePhoneNumber = (record: FlatfileRecord, field: string) => {
  // Validate a Record's phone number
  const phoneNumber = record.get(field) as string;
  if (!phoneNumber) {
    return;
  }
  let parsedPhoneNumber;
  try {
    // First parse the number
    parsedPhoneNumber = phoneUtil.parseAndKeepRawInput(phoneNumber, 'US'); // Assume US for now
  } catch (e) {
    console.error("Error parsing phone number", e.message);
    // Parser will throw an error if the number is wildly invalid, but not if it's just a little off
    return record.addError(field, "Invalid phone number");
  }
  //  isValidNumber() performs a more thorough validation, so let's use that
  if (!parsedPhoneNumber || !phoneUtil.isValidNumber(parsedPhoneNumber)) {
    if (phoneNumber && phoneNumber.length > 0) {
      console.log("Invalid phone number");
      record.addError(field, "Invalid phone number"); // Add an error to the record
    }
  } else {
    console.log();
    record.set(field, parsedPhoneNumber.getNationalNumber().toString()); // Standardize phone numbers to E.164 without the country code
  }

}