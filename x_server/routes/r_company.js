("use strict");

//设备API子路由

var express = require("express");
var router = express.Router();

//公司数据
var CompanyModel = require("../models/company");

router.get("/name", (req, res) => {
    const reply = {
        code: -1,
        message: '',
    }
    CompanyModel.find({}, (err, data) => {
        if (err) {
            reply.message = 'get company faild';
            res.send(reply);
            return;
        }
        reply.code = 0;
        reply.message = 'get company success!';
        reply.data = data;
        res.send(reply)
    })
});
router.post("/addcompany", async (req, res) => {
    const reply = {
        code: -1,
        message: '',
    }
    const company_data = new CompanyModel({
        name: req.param('company_name') || '',
        address: req.param('company_address') || '',
        phone: req.param('company_phone') || '',
        email: req.param('company_email') || '',
    });
    await company_data.save(async (err) => {
        if (err) {
            reply.message = 'save faild';
            res.send(reply);
            return
        }
        reply.message = 'save success';
        reply.code = 0;
        res.send(reply);
    })
})

module.exports = router;