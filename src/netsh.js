
const exec = require('child_process').exec;
const sudo = require('sudo-prompt');
const os = require('os');
const {dialog} = require('electron')

const options = {
    name: 'Electron'//,
    //icns: '/Applications/Electron.app/Contents/Resources/Electron.icns', // (optional)
};

function toLines(text) {
    return text.split(/\r\n|\r|\n/);
}

function toWords(text) {
    return text.split(/ +/);
}

function getIps() {
    var ifacesObj = {}
    ifacesObj.ipv4 = [];
    ifacesObj.ipv6 = [];
    var interfaces = os.networkInterfaces();

    for (var dev in interfaces) {
        interfaces[dev].forEach(function(details){
            if (!details.internal){
                switch(details.family){
                    case "IPv4":
                        ifacesObj.ipv4.push({name:dev, address:details.address});
                    break;
                    case "IPv6":
                        ifacesObj.ipv6.push({name:dev, address:details.address})
                    break;
                }
            }
        });
    }
    return ifacesObj;
};

function list(cb) {
    exec('chcp 65001 | netsh interface portproxy show v4tov4', (err, stdout, stderr) => {
        if (err) { console.log(err); }
        var maps = toLines(stdout).filter(l => {
            return (l[0] >= '0' && l[0] <= 9)
        }).map(l => {
            var ws = toWords(l);
            return {'fromAddr':ws[0], 'fromPort':ws[1], 'toAddr':ws[2], 'toPort':ws[3]};
        });
        var devs = getIps();
        var result = {devs:devs,maps:maps};
        cb(result);
    });
}

function remove({fromAddr:addr, fromPort:port}, cb) {
    sudo.exec('netsh interface portproxy delete v4tov4 listenport='+port+' listenaddr='+addr, options, (err, stdout, stderr) => {
        if (err) { console.log(err); }
        cb();
    });
}

function add({fromAddr, fromPort, toAddr, toPort}, cb) {
    sudo.exec('netsh interface portproxy add v4tov4 listenport='+fromPort+' listenaddr='+fromAddr+' connectport='+toPort+' connectaddr='+toAddr, options, (err, stdout, stderr) => {
        if (err) { console.log(err); }
        cb();
    })
}

function change(oldMap, newMap, cb) {
    sudo.exec('netsh interface portproxy delete v4tov4 listenport='+oldMap.fromPort+' listenaddr='+oldMap.fromAddr+' & netsh interface portproxy add v4tov4 listenport='+newMap.fromPort+' listenaddr='+newMap.fromAddr+' connectport='+newMap.toPort+' connectaddr='+newMap.toAddr, options, (err, stdout, stderr) => {
        if (err) { console.log(err); }
        cb();
    })
}

module.exports = {
    list: list, 
    add: add, 
    remove: remove, 
    change: change
};
