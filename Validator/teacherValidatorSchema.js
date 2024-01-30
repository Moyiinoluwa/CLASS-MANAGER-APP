const joi = require('joi')

 const validator = (schema) => (payload) => 
 schema.validate(payload, { abortEarly: false })


 //Registration validator
 const registerTeacherValidator = joi.object({
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

 exports.registerTeacherValidator = validator(registerTeacherValidator)
 exports.teacherLoginValidator = validator(teacherLoginValidator)
 exports.verifyTeacherOtpValidator = validator(verifyTeacherOtpValidator)
 exports.resendTeacherOtp = validator(resendTeacherOtp)
 exports.resetTeacherPasswordLinkValidator = validator(resetTeacherPasswordLinkValidator)
 exports.teacherPasswordlLinkValidator = validator(teacherPasswordlLinkValidator)
 exports.changePasswordValidator = validator(changePasswordValidator)