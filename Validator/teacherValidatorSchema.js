const joi = require('joi')

 const validator = (schema) => (payload) => 
 schema.validate(payload, { abortEarly: false })


 //Registration validator
 const registerTeacherValidator = joi.object({
    surname: joi.string().required(),
    name: joi.string().required(),
    subject: joi.string().required(),
    qualification: joi.string().required(),
    username: joi.string().lowercase().required(),
    email: joi.string().email().required(),
    password: joi.string().min(8).max(16).required()
 });

 //login validator
 const teacherLoginValidator = joi.object({
   email: joi.string().email().required(),
   password: joi.string().min(8).max(16).required()
 });

 //verify teacher otp
 const verifyTeacherOtpValidator = joi.object({
   email: joi.string().email().required(),
   otp: joi.string().min(6).max(6).required()
 });

//resend otp
const resendTeacherOtp = joi.object({
  email: joi.string().email().required()
});

// send reset password link
const resetTeacherPasswordLinkValidator = joi.object({
  email: joi.string().email().required()
});

// reset password link
const teacherPasswordlLinkValidator = joi.object({
    email: joi.string().email().required(),
    password: joi.string().min(8).max(16).required()
});

//change password
const changePasswordValidator = joi.object({
  email: joi.string().email().required(),
  oldPassword: joi.string().min(8).max(16).required(),
  newPassword: joi.string().min(8).max(16).required()
});

//update teacher
const updateValidator = joi.object({
  id: joi.string().required()
});

//delete teacher
const deleteValidator = joi.object({
  id: joi.string().required()
});

//upload proile picture
// const uploadValidator = joi.object({
//   id: joi.string().required()
// });

//teacher sends assignment 
const sendAssignmentValidator = joi.object({
  klass: joi.string().required(),
  subject: joi.string().required(),
  assignment: joi.string().required(),
  student_id: joi.string().required()
});

//teacher upload student score
const uploadScoreValidator = joi.object({
  student_id: joi.string().required(),
  klass: joi.string().required(),
  subject: joi.string().required(),
  score: joi.string().required(),
  assignment: joi.string().required()
});

//teacher edit student score
const editScoreValidator = joi.object({
  id: joi.string().required(),
  score: joi.string(),
  klass: joi.string().required(),
  student_id: joi.string().required()
});

//teacher sends email to all student
const sendEmailToAllValidator = joi.object({ 
  email: joi.string().email()
});

//teacher sends email to one student
const sendEmailToOneValidator = joi.object({
  email: joi.string().email()
});

//teacher sends student message
const inboxMessageValidator = joi.object({
  message: joi.string().required()
});

//teacher sends message to another teacher
const replyTeacherValidator = joi.object({
  message: joi.string().required()
});


 exports.registerTeacherValidator = validator(registerTeacherValidator)
 exports.teacherLoginValidator = validator(teacherLoginValidator)
 exports.verifyTeacherOtpValidator = validator(verifyTeacherOtpValidator)
 exports.resendTeacherOtp = validator(resendTeacherOtp)
 exports.resetTeacherPasswordLinkValidator = validator(resetTeacherPasswordLinkValidator)
 exports.teacherPasswordlLinkValidator = validator(teacherPasswordlLinkValidator)
 exports.changePasswordValidator = validator(changePasswordValidator)
 exports.updateValidator = validator(updateValidator)
 exports.deleteValidator = validator(deleteValidator)
 //exports.uploadValidator = validator(uploadValidator)
 exports.sendAssignmentValidator = validator(sendAssignmentValidator)
 exports.uploadScoreValidator = validator(uploadScoreValidator)
 exports.editScoreValidator = validator(editScoreValidator)
 exports.sendEmailToAllValidator = validator(sendEmailToAllValidator)
 exports.sendEmailToOneValidator = validator(sendEmailToOneValidator)
 exports.inboxMessageValidator = validator(inboxMessageValidator)
 exports.replyTeacherValidator = validator(replyTeacherValidator)