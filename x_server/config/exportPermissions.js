exports.getPermissions = function(req,res){
    return req.session.info.role;
}