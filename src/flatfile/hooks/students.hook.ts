import { FlatfileRecord, recordHook } from "@flatfile/plugin-record-hook";
import { PhoneNumberUtil, PhoneNumberFormat } from 'google-libphonenumber';

const phoneUtil = PhoneNumberUtil.getInstance();

export const studentsHook = recordHook("students", (record: FlatfileRecord) => {
  // Validate a Record's phone number
  const phoneNumber = record.get("parentMobile") as string;
  let parsedPhoneNumber;
  try {
    // First parse the number
    parsedPhoneNumber = phoneUtil.parseAndKeepRawInput(phoneNumber, 'US'); // Assume US for now
  } catch (e) {
    // Parser will throw an error if the number is wildly invalid, but not if it's just a little off
    // Just log the error and continue; parsedPhoneNumber will remain undefined
    console.error("Error parsing phone number", e.message);
  }
  //  isValidNumber() performs a more thorough validation, so let's use that
  if (!parsedPhoneNumber || !phoneUtil.isValidNumber(parsedPhoneNumber)) {
    if (phoneNumber && phoneNumber.length > 0) {
      console.log("Invalid phone number");
      record.addError("parentMobile", "Invalid phone number"); // Add an error to the record
    }
  } else {
    record.set("parentMobile", phoneUtil.format(parsedPhoneNumber, PhoneNumberFormat.E164)); // Standardize phone numbers to E.164
  }

  return record;
}); 