var mqtt = require("mqtt");
const mqttPath =
"mqtt://" +
(process.env.MQTT_HOST || "localhost") +
":" +
(process.env.MQTT_PORT || "1883");
const mqttTopic = process.env.MQTT_TOPIC||"xizi-video";
const mqttClient = process.env.MQTT_CLIENT_ID || "ROOT_USR";
var express = require("express");
var router = express.Router();
var theStep = {};


router.post("/sendvideo",function(req,res,next){
    var msg = req.param("theMsg");
    var thisId = msg.substr(0,12);
    if(msg.indexOf("on")!= -1){
        if(theStep[thisId] != undefined || theStep[thisId] == 0){
            theStep[thisId]++
        }else{
            theStep[thisId] = 1;
        }
    }
    if(msg.indexOf("off") != -1){
        theStep[thisId]--;
        if(theStep[thisId] <= 0){
            theStep[thisId] = 0
        }
    }
    console.log(theStep)
    if(msg.indexOf("on") != -1){
        var client = mqtt.connect(mqttPath,{
        });
        client.on('connect',function(){
            console.log("connected......");
            client.publish(mqttTopic,msg);
        });
    }
    if(msg.indexOf("off") != -1 && theStep[thisId] <= 0 ){
        var client = mqtt.connect(mqttPath,{
            // clientId:mqttClient
            // clientId:"ROOT_USR1"
        });
        client.on('connect',function(){
            console.log("connected......");
            client.publish(mqttTopic,msg);
        });
    }

    res.send({
        code:0,
        msg:"send message success!"
    })
    
})


module.exports = router;
