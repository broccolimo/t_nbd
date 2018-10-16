const express = require("express");
const router = express.Router();
const SMSClient = require("@alicloud/sms-sdk");
const accessKeyId = "LTAIGfKWPMOBRGoj";
const secretAccessKey = "6cZ4Fmeb4Aytbymz0psxv8o5KKR9Ni";

let smsClient = new SMSClient({accessKeyId, secretAccessKey});

router.post("/sendSMS", function(req, res, next){
	smsClient.sendSMS(
		{
   			PhoneNumbers: req.param("PhoneNumbers"),
    		SignName: '王春梅',
    		TemplateCode: 'SMS_122282790',
		    TemplateParam: '{"per":"' + req.param("per") + '","address":"' + req.param("address") + '","model":"' + req.param("model") + '","orderID":"' + req.param("orderID") + '"}'
       }
	).then(
		function (r) {
    		let {Code}=r
    		if (Code === 'OK') {
        		console.log(r);
        		res.send({
        			code : 0,
        			msg : r
        		});
    		}
		}, 
		function (err) {
    		console.log(err);
    		res.send({
    			code : -1,
    			msg : err
    		});
		}
	);
});

module.exports = router;