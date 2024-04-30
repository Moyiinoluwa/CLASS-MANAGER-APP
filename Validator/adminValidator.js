const joi = require('joi')

 const validator = (schema) => (payload) =>
 schema.validate(payload, { aborteEarly: false })

 //register admin
 const registerAdminValidator = joi.object({
    username: joi.string().lowercase().required(),
    email: joi.string().email().required(),
    password: joi.string().min(8).max(16).required()
 });

//login 
const loginAdminValidator = joi.object({
    email: joi.string().email().lowercase().required(),
    password: joi.string().min(8).max(16).required()
});

//verify otp
const verifyAdminOtpValidator = joi.object({
    otp: joi.string().min(6).max(6).required()
});

//resend otp
const resendAdminOtpValidator = joi.object({
    email: joi.string().email().lowercase().required()
})

//send reset password link
const resetAdminPasswordLinkValidator = joi.object({
    email: joi.string().email().lowercase().required()
});

//reset password
const sendAdminPasswordValidator = joi.object({
    email: joi.string().email().lowercase().required(),
    password: joi.string().min(8).max(16).required()
});

//change password
const changeAdminPasswordValidator = joi.object({
    email: joi.string().email().lowercase().required(),
    oldPassword: joi.string().min(8).max(16).required(),
    newPassword: joi.string().min(8).max(16).required()
});

//update admin
const updateAdminValidator = joi.object({
    username: joi.string().required(),
    email: joi.string().email().lowercase().required(),
});

const adminUpdateTeacherValidator = joi.object({
    surname: joi.string().required(),
    name: joi.string().required(),
    username: joi.string().required(),
    email: joi.string().email().lowercase().required(),
    subject: joi.string().required(),
    qualification: joi.string().required(),
});

const adminUpdateStudentValidator = joi.object({
    surname: joi.string().required(),
    name: joi.string().required(),
    email: joi.string().email().lowercase().required(),
    username: joi.string().required(),

});
//send email to teachers
// const adminSendEmailToTeachersValidator = joi.object({
//     email: joi.string().email().required()
// });




 exports.registerAdminValidator = validator(registerAdminValidator)
 exports.loginAdminValidator = validator(loginAdminValidator)
 exports.verifyAdminOtpValidator = validator(verifyAdminOtpValidator)
 exports.resendAdminOtpValidator = validator(resendAdminOtpValidator)
 exports.resetAdminPasswordLinkValidator = validator(resetAdminPasswordLinkValidator)
 exports.sendAdminPasswordValidator = validator(sendAdminPasswordValidator)
 exports.changeAdminPasswordValidator = validator(changeAdminPasswordValidator)
 exports.updateAdminValidator = validator(updateAdminValidator)
 exports.adminUpdateTeacherValidator = validator(adminUpdateTeacherValidator)
 exports.adminUpdateStudentValidator = validator(adminUpdateStudentValidator)
 //exports.adminSendEmailToTeachersValidator = validator(adminSendEmailToTeachersValidator)