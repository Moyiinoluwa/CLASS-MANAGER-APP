const nodemailer = require('nodemailer')

//create a class called MailService
class MailService {
    //create a class constructor
    constructor() {
        //send the email to the student via gmail
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.AUTH_EMAIL,
                pass: process.env.AUTH_PASSWORD
            }
        });

        //verify the transporter
        this.transporter.verify((success, error) => {
            if (success) {
                console.log(success)
            } else {
                console.log(error)
            }
        });
    }

    //method to send the email
    async sendEmail(email, subject, body) {
        try {
            const mailOptions = {
                from: process.env.AUTH_EMAIL,
                to: email,
                subject: subject,
                html: body
            }

            await this.transporter.sendMail(mailOptions)

            //return a response if the email was sent 
            return {
                status: 'Pending',
                message: 'Verification token sent'
            }
        } catch (error) {
            //return a response if the email was not sent
            return {
                status: 'Failed',
                message: 'somrthing went wrong'
            }
        }
    }

}

const mailService = new MailService()

module.exports = { mailService }