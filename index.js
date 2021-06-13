const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { exit } = require('process');
// axios.get('https://xkcd.com/').then((response)=> {
//     const $ = cheerio.load(response.data);
//     console.log('callback', $('#comic img').attr('src'));
// }).catch((error) => {

// });

var textData = 'game,num1,num2,num3,num4,num5,lucky1,lucky2\n';

fs.writeFileSync('images/numbers.txt', textData);


async function appending(textNumbers){
    const log = fs.createWriteStream('images/numbers.txt', { flags: 'a' });

    // on new log entry ->
    log.write(textNumbers+ '\n');
}

async function download(url, filename){
    const writer = fs.createWriteStream(path.resolve(__dirname, filename));
    const response = await axios.get(url, {responseType: 'stream'});
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

async function getOrCache(url){

    let md5 = crypto.createHash('md5');
    md5.update(url);
    let cacheName = `cache/${md5.digest('hex')}`;

    try {
        if (fs.existsSync(cacheName)) {
            console.log('cached request');
          return JSON.parse(fs.readFileSync(cacheName, {encoding:'utf8', flag:'r'}));
        } else {
            let response = await axios.get(url, { 
                headers: {
                    'accept': 'application/json'
                }
            });
            fs.writeFileSync(cacheName, JSON.stringify(response.data));
            console.log('live request');
            return response.data;
        }
      } catch(err) {
        console.error(err)
      }
}

(async ()=> {
    let eurojackpotURL = ' https://www.eestiloto.ee/osi/draws.do?gameSortType=2&sortProperty=DRAWDATE&sortDirection=false&pageNumber=1';
    let k = 1;
    for(let i = 0; i<30; i++){
        try {
            k = k + 1;
            let data = await getOrCache(eurojackpotURL);
            console.log('euroUrl ' + eurojackpotURL);
            //console.log(data);
            
            const $ = cheerio.load(data);
            
            let loosiNumArray = $('.launcher');
            let loosiNumArrayLenght = loosiNumArray.length;
            for (let i = 0; i < loosiNumArrayLenght; i++) { //loosiNumArray.length
                let element = $(loosiNumArray[i]);
                let loosiNumArrayText = $(element).text();

                //console.log('length is: ' + loosiNumArrayLenght);
                console.log('game number: ' + loosiNumArrayText);
                let myData = 'https://www.eestiloto.ee' + $(loosiNumArray[i]).attr('href');
                //console.log(myData);
                await new Promise(resolve => setTimeout(resolve, 1000));

                let browser = await puppeteer.launch();
                let page = browser.newPage();

                await (await page).goto(myData, {waitUntil: 'networkidle2'});

                

                let numData = await (await page).evaluate(() => {
                    let winNumArr = document.querySelectorAll('div[class="game_number"]');
                    let winNumArrLenght = document.querySelectorAll('div[class="game_number"]').length;
                    let winNumText = '';
                    let j = 0; 
                    while (j < 7) {
                        
                        let winNum = document.querySelectorAll('div[class="game_number"]')[j].innerText;
                        
                        winNumText += winNum;
                        j++;
                        if (j === 7) {
                            break;
                        };
                        winNumText +=  ',';
                    };
                    return winNumText;
                   
                    
                    
                    
                });
                console.log('winNumArr length: '+ loosiNumArrayText + ',' + numData);
                let appendableText = loosiNumArrayText + ',' + numData;
                console.log('appendable: '+ appendableText);
                await appending(appendableText);
                await browser.close();
                


                ////// leheküljed                  
                let pageNum = k.toString();
                let paginationLink = ' https://www.eestiloto.ee/osi/draws.do?gameSortType=2&sortProperty=DRAWDATE&sortDirection=false&pageNumber=' + pageNum;
                    
                eurojackpotURL = paginationLink;
    
            };
                
        } catch (err) {
            console.log(err);
        }
    }
    
})();