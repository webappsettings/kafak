// ഷീറ്റ് ഐഡി ഇവിടെ കൊടുക്കുക
var SHEET_ID = "1UCp0HAcoJeyueaBB7HWHToyBfo7e8cva9TvaHundm2E";

function doGet(e) {
    try {
        var action = e.parameter.action;
        var kfkcode = e.parameter.kfkcode;
        var frm = e.parameter.frm;

        var ss = SpreadsheetApp.openById(SHEET_ID);
        var orderSheet = ss.getSheetByName("AutoData");

        // --- LIST ACTION ---
        if (action === 'list') {
            const data = orderSheet.getDataRange().getValues();
            const rows = [];
            for (let i = 1; i < data.length; i++) {
                const row = data[i];
                if (row[0] === 'yes') continue;
                rows.push({
                    rowNumber: i + 1,
                    confirm: row[1],
                    whatsapp: row[2],
                    timestamp: row[3],
                    name: row[4],
                    phone: row[5],
                    pincode: row[6],
                    postoffice: row[7],
                    officename: row[8],
                    district: row[9],
                    state: row[10],
                    house: row[11],
                    place: row[12],
                    quantity: row[13],
                    message: row[14],
                    kfkcode: row[15],
                    orderid: row[16]
                });
            }
            return ContentService.createTextOutput(JSON.stringify({ result: 'success', rows }))
                .setMimeType(ContentService.MimeType.JSON);
        }

        // --- CONFIRM ACTION ---
        if (action === 'confirm' && e.parameter.row) {
            const row = parseInt(e.parameter.row, 10);
            if (isNaN(row) || row < 2) {
                return ContentService.createTextOutput(JSON.stringify({ result: 'invalid_row' }))
                    .setMimeType(ContentService.MimeType.JSON);
            }
            orderSheet.getRange(row, 1).setValue('yes');
            return ContentService.createTextOutput(JSON.stringify({ result: 'success' }))
                .setMimeType(ContentService.MimeType.JSON);
        }

        // --- GET DATA ACTION ---
        if (action === 'get' && kfkcode) {
            var row = null;

            if (frm === 'url') {
                // ERROR FIXED HERE: Changed rowStr to kfkcode
                row = parseInt(kfkcode.replace('o', ''), 10);
            } else {
                var finder = orderSheet.createTextFinder(kfkcode).matchCase(true).matchEntireCell(true).findNext();
                if (finder) row = finder.getRow();
            }

            if (row) {
                var lastCol = orderSheet.getLastColumn();
                // Range selection optimized to prevent errors if columns are empty
                var orderData = orderSheet.getRange(row, 1, 1, lastCol).getValues()[0];

                return ContentService.createTextOutput(JSON.stringify({
                    result: 'success',
                    data: {
                        whatsapp: orderData[2],
                        timestamp: orderData[3],
                        name: orderData[4],
                        phone: orderData[5],
                        pincode: orderData[6],
                        postoffice: orderData[7],
                        officename: orderData[8],
                        district: orderData[9],
                        state: orderData[10],
                        house: orderData[11],
                        place: orderData[12],
                        quantity: orderData[13],
                        message: orderData[14],
                        kfkcode: orderData[15],
                        orderid: orderData[16]
                    }
                })).setMimeType(ContentService.MimeType.JSON);
            } else {
                return ContentService.createTextOutput(JSON.stringify({ result: 'not_found' }))
                    .setMimeType(ContentService.MimeType.JSON);
            }
        }

        return ContentService.createTextOutput(JSON.stringify({ result: 'invalid_request' }))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({ result: 'error', error: error.message }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

// Helper Functions
function safeEncodeBase62(phone, pincode, quantity) {
    var cleanQuantity = quantity.split(' ')[0];
    var combined = phone + pincode + cleanQuantity;
    return encodeBase62(combined);
}

function encodeBase62(numStr) {
    var base62Chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var num = parseInt(numStr, 10);
    var result = "";
    if (isNaN(num) || num < 0) return "0";
    while (num > 0) {
        var remainder = num % 62;
        result = base62Chars.charAt(remainder) + result;
        num = Math.floor(num / 62);
    }
    return result || "0";
}

// --- POST FUNCTION ---
function doPost(e) {
    var lock = LockService.getScriptLock();
    try {
        lock.waitLock(15000);

        var ss = SpreadsheetApp.openById(SHEET_ID);
        var userSheet = ss.getSheetByName("Users 1");
        var orderSheet = ss.getSheetByName("AutoData");

        var data = JSON.parse(e.postData.contents);
        var orderData = data.orderData;

        var kfkcode = orderData.kfkcode || '';
        var range = orderSheet.getDataRange();
        var finder = range.createTextFinder(kfkcode).matchEntireCell(true).findNext();

        var formattedDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy hh:mma");
        var now = new Date();
        var orderid = safeEncodeBase62(orderData.phone, orderData.pincode, orderData.quantity);

        var lastRowUserSheet = userSheet.getLastRow();
        var lastRowOrderSheet = orderSheet.getLastRow();

        // Removed setNumberFormat from here for speed. 
        // Please format the Timestamp column in your Google Sheet directly (Format > Number > Date Time).

        if (finder) {
            // Update existing
            var row = finder.getRow();
            orderSheet.getRange(row, 3, 1, 15).setValues([[
                orderData.whatsapp, now, orderData.name, orderData.phone,
                orderData.pincode, orderData.postoffice, orderData.officename,
                orderData.district, orderData.state, orderData.house,
                orderData.place, orderData.quantity, orderData.message,
                orderData.kfkcode, orderid
            ]]);

            userSheet.getRange(row, 1, 1, 13).setValues([[
                orderData.whatsapp, now, orderData.name, orderData.phone,
                orderData.pincode, orderData.postoffice, orderData.officename,
                orderData.district, orderData.state, orderData.house,
                orderData.place, orderData.kfkcode, orderid
            ]]);

            // Use existing row numbers for response
            lastRowUserSheet = row;
            lastRowOrderSheet = row;

        } else {
            // Append New
            userSheet.appendRow([
                orderData.whatsapp, now, orderData.name, orderData.phone,
                orderData.pincode, orderData.postoffice, orderData.officename,
                orderData.district, orderData.state, orderData.house,
                orderData.place, orderData.kfkcode, orderid
            ]);

            // Update last row count after appending
            lastRowUserSheet = userSheet.getLastRow();

            orderSheet.appendRow([
                "", "", orderData.whatsapp, now, orderData.name, orderData.phone,
                orderData.pincode, orderData.postoffice, orderData.officename,
                orderData.district, orderData.state, orderData.house,
                orderData.place, orderData.quantity, orderData.message,
                orderData.kfkcode, orderid, lastRowUserSheet
            ]);

            lastRowOrderSheet = orderSheet.getLastRow();
        }

        return ContentService.createTextOutput(
            JSON.stringify({
                result: "success",
                data: orderData,
                timestamp: formattedDate,
                orderid: orderid,
                userLoc: lastRowUserSheet,
                orderLoc: lastRowOrderSheet
            })
        ).setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return ContentService.createTextOutput(
            JSON.stringify({ result: "error", message: err.message })
        ).setMimeType(ContentService.MimeType.JSON);
    } finally {
        lock.releaseLock();
    }
}