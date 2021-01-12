const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const csv = require('csvtojson');
const request = require('request');

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.post('/', checkCSVValidity, (req, res) => {
    // get the url & selected_fields from request body
    let {url, select_fields:fields} = req.body.csv;

    // convert fields to lowercase
    fields = fields.map(field => field.toLowerCase());

    // convert csv to json array
    csv().fromStream(request.get(url))
    .then(jsonArray => {
        let newArr = [];
        if(fields.length >= 1) {
            jsonArray.forEach(item => {
                const record = {}
                for(let key in item) {
                    if(fields.includes(key.toLowerCase())) {
                        record[key] = item[key];
                    }
                }
                // check if any of the passed field corresponds to fetched data
                if(Object.keys(record).length >= 1){
                    newArr.push(record);
                }
            });
        }else {
            newArr = jsonArray;
        }

        const finalResponse = {};
        finalResponse["conversion_key"] = Math.floor(Math.random() * Date.now());
        finalResponse["json"] = newArr;

        return res.send(finalResponse);
    }, (err)=>{ 
        console.log(err); 
    });
});

/*
MIDDLEWARES
*/
function checkCSVValidity(req, res, next) {
    try {
        const {url} = req.body.csv;

        // get url to csvlint package
        var options = {
            url: 'http://csvlint.io/package.json',
            method: 'POST',
            body: `urls[]=${url}`
        };
        request(options, (error, response, body) => {
            if (!error && response.statusCode == 200) {
                const pkgURL = JSON.parse(body)["package"]["url"]+'.json';

                // get the csv validation
                var options = {
                    url: pkgURL
                };
                request(options, (error, response, body) => {
                    if (!error && response.statusCode == 200) {                        
                        if(JSON.parse(body)["package"]["validations"].length >= 1){
                            const status = JSON.parse(body)["package"]["validations"][0]["state"];
                            if(status == "valid" || status == "warnings" ) {
                                return next();
                            }else {
                                return res.status(400).send('Invalid csv')
                            }
                        }else {
                            return res.status(400).send("Check the passed URL. It seems invalid");
                        }
                    }
                });
            }
        });
    }catch(error) {
        return res.status(400).send("error");
    }
}


let port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server running at http://localhost:${port}`));