"use strict";
const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const FaultSchema = new Schema({
	lift_id: String,
	faultCode: Number
});

module.exports = mongoose.model("temp_fault", FaultSchema, "temp_fault");