exports = module.exports = function(req, res) {

    let locals = res.locals;
    
	// locals.section is used to set the currently selected
	// item in the header navigation.
    locals.section = 'clan';
    
    const request = require('request');
                
    let clanId = null;
    try{
        clanId = req.user.data.relationships.clanMemberships.data[0].id;
    }
    catch{
        // The user doesnt belong to a clan
        res.redirect('/clans');
        return;
    }
    
    request.get(
        {
            url: 
                process.env.API_URL 
                + '/data/clanMembership/'+clanId+'/clan'
                + '?include=memberships.player'
                + '&fields[clan]=createTime,description,name,tag,updateTime,websiteUrl,founder,leader'
                + '&fields[player]=login,updateTime'
                + '&fields[clanMembership]=createTime,player',
            headers: {
                'Authorization': 'Bearer ' + req.user.data.attributes.token
            }
        },
        function (err, childRes, body) {
            
            const clan = JSON.parse(body);
            
            if (clan.data.relationships.leader.data.id != req.user.data.id){
                // Not the leader! Should'nt be able to manage shit
                res.redirect('/clans/see?id='+clan.id);
                return;
            }
            
            locals.clan_name = clan.data.attributes.name;
            locals.clan_tag = clan.data.attributes.tag; 
            locals.clan_description = clan.data.attributes.description; 
            locals.me = req.user.data.id;
            
            let members = {};
            
            for (k in clan.included){
                switch(clan.included[k].type){
                    case "player":
                        const player = clan.included[k]; 
                        if (!members[player.id]) members[player.id] = {};
                        members[player.id].id = player.id;
                        members[player.id].name = player.attributes.login;
                        break;
                        
                    case "clanMembership":
                        const membership = clan.included[k]; 
                        const member = membership.relationships.player.data;
                        if (!members[member.id]) members[member.id] = {};
                        members[member.id].id = member.id;
                        members[member.id].joinedAt = membership.attributes.createTime;
                        break;
                    
                }
            }
            
            locals.clanMembers = members;

            var flash = null;

            if (req.originalUrl == '/clan_created') {
                flash = {};

                flash.class = 'alert-success';
                flash.messages = [{msg: 'You have successfully created your clan'}];
                flash.type = 'Success!';
            }
            else if (req.query.flash){
                let buff = new Buffer(req.query.flash, 'base64');  
                let text = buff.toString('ascii');
                
                flash = JSON.parse(text);
            }
            
            // Render the view
            res.render('clans/manage', {flash: flash});
        }
    );
};