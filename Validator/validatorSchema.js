const joi = require('joi')

 const validator = (schema) => (payload) =>
 schema.validate (payload, { abortEarly: false })

 
 //registration validation
const signupValidator = joi.object({
    surname: joi.string().required(),
    name: joi.string().required(),
    username: joi.string().lowercase().required(),
    email: joi.string().email().lowercase().required(),
    password: joi.string().min(8).max(16).required()
});

//login validation
const loginValidator = joi.object({
    email: joi.string().email().lowercase().required(),
    password: joi.string().min(8).max(16).required()
});

//verify otp validation
const verifyOtpValidator = joi.object({
    email: joi.string().email().lowercase().required(),
    otp: joi.string().min(6).max(6).required()
});

//resend otp
const resendOtpValidator = joi.object({
    email: joi.string().email().lowercase().required()
});

//reset password link
const resetPasswordLinkValidator = joi.object({
    email: joi.string().email().lowercase().required()
});

//set new password
const setPasswordValidator = joi.object({
    email: joi.string().email().required(),
    password: joi.string().min(8).max(16).required()
});

//change password
const changePasswordValidator = joi.object({
    email: joi.string().email().required(),
    newPassword: joi.string().min(8).max(16).required(),
    oldPassword: joi.string().min(8).max(16).required()
});

//update student profile
const updateStudentValidator = joi.object({
    id: joi.string().required()
});

//delete student profile
const deletestudentvalidator = joi.object({
    id: joi.string().required()
});

//upload profile picture
const uploadProfilePictureValidator = joi.object({
    id: joi.string().required()
});

//student submit assignment

//student check score
const studentScoreValidator = joi.object({
    subject: joi.string().required()
});

//student sends message to teacher
const messageTeacherVaildator = joi.object({
    message: joi.string().required()
});

//student message another student
const messageStudentVaildator = joi.object({
    message: joi.string().required()
});

//student search for each other
const studentSearchValidator = joi.object({
    username: joi.string().lowercase().required()
});


exports.signupValidator = validator(signupValidator)
exports.loginValidator = validator(loginValidator)
exports.verifyOtpValidator= validator(verifyOtpValidator)
exports.resendOtpValidator = validator(resendOtpValidator)
exports.resetPasswordLinkValidator = validator(resetPasswordLinkValidator)
exports.setPasswordValidator = validator(setPasswordValidator)
exports.changePasswordValidator = validator(changePasswordValidator)
exports.updateStudentValidator = validator(updateStudentValidator)
exports.deletestudentValidator = validator(deletestudentvalidator)
exports.uploadProfilePictureValidator = validator(uploadProfilePictureValidator)
exports.studentScoreValidator = validator(studentScoreValidator)
exports.messageTeacherVaildator = validator(messageTeacherVaildator)
exports.messageStudentVaildator = validator(messageStudentVaildator)
exports.studentSearchValidator = validator(studentSearchValidator)