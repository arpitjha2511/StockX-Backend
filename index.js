const cheerio = require("cheerio");
const axios = require("axios");
const express = require("express");

const app = express();
app.use(express.json());
//app.use(cors());
const port = process.env.PORT || 8080;
app.listen(port,()=>{console.log(`Listening on port ${port}`)})

const session = axios.create({headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    },
});

//const TEST_URL = "https://finance.yahoo.com/quote/JIOFIN.BO?p=JIOFIN.BO&.tsrc=fin-srch";

app.get('/status', async (req, res) => {
    res.json({status: "API is live"});
});
app.get('/', async (req, res) => {
    res.json({status: "API is live"});
});

app.get('/stockdata', async (req, res) => {
    const stockLink = req.get('X-Stock-Link'); // Read stock link from the custom header
    try {
        const x= await getData(stockLink);
        // Respond with the JSON data
        res.json(x);
    } catch (error){
        
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/stockdata/:exchange/:name', async (req, res) => {
    // Read stock name and exchange from the URL
    const name = req.params.name;
    let exchange = req.params.exchange;
    //Sample Google Link:https://www.google.com/finance/quote/RELIANCE:NSE?hl=en
    //Sample Yahoo Link: https://finance.yahoo.com/quote/RELIANCE.NS
    if (exchange=='BSE'){exchange = 'BOM'}
    const googleLink = `https://www.google.com/finance/quote/${name}:${exchange}?hl=en`;
    const yahooLink =   `https://finance.yahoo.com/quote/${name}.${exchange.slice(0,2)}`
    //console.log(googleLink);
    //console.log(yahooLink);
    try {
        const x= await getDataGoogle(googleLink);
        if(x.Name==''){throw {status:"Google Fin Failed"};}
        res.json(x);
    }catch(e1){
        try{
            const y= await getDataYahoo(yahooLink);
            res.json(y);
        }catch (e2){
            console.error(e2);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});









async function getDataGoogle(URL){
    const response = await session.get(URL);
    const $ = cheerio.load(response.data);
    //console.log(response.data);
    const name = $(".zzDege").text();
    const price= $(".YMlKec.fxKbKc").text();
    const lastUpdated= $(".ygUjEc").text().slice(0,26);
    const about = $(".bLLb2d").text();
    //const changes= $(".P2Luy.Ez2Ioe.ZYVHBb").text();
    
    const data = {
            Name : name ,
            Price: price ,
            lastUpdate: lastUpdated,
            about: about,
            dataSource:"Google Finance",
            extractionStatus: true,
            message:"Data Extraction Successful"
        }
        return data;
}

async function getDataYahoo(URL){
    const response = await session.get(URL)
    const $ = cheerio.load(response.data);
    const name = $('div.D\\(ib\\) > h1.D\\(ib\\).Fz\\(18px\\)').text();;
    const price= $('fin-streamer[data-test="qsp-price"]').attr('value');
    const lastUpdated= $("#quote-market-notice").text();
    const about =  $('div[data-test="qsp-profile"] .businessSummary').text();
    
    const data = {
            Name : name ,
            Price: price ,
            lastUpdate: lastUpdated,
            about: about,
            dataSource:"Yahoo Finance",
            extractionStatus: true,
            message:"Data Extraction Successful"
        }
    return data;
}

//First Tries Google Finance Then tries Yahoo Finance
async function getData(URL){
    try{
        const googleData= await getDataGoogle(URL);
        if(googleData.Name==''){throw {status:"Google Fin Failed"};}
        return googleData;
    }catch(e1){
        try{
            const yahooData = await getDataYahoo(URL);
            return yahooData;
        }catch(e2){
            return {
                Name : "" ,
                Price: "" ,
                lastUpdate: "",
                about: "",
                dataSource:"",
                extractionStatus: false,
                message:"Data Extraction Failed"
            }
        }
    }
}

//To view the data being returned:
// async function returnedData(URL){
//     const x= await getData(URL);
//     console.log("returned data:\n");
//     console.log(x);
// }
// returnedData(TEST_URL);