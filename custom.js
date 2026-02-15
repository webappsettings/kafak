var scriptProp = PropertiesService.getScriptProperties();

function setup() {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  scriptProp.setProperty("key", doc.getId());
}

function doGet(e) {
  var action = e.parameter.action;
  if (action == 'getCustomer') return getCustomer(e);
  if (action == 'getOrder') return getOrderDetails(e);
  if (action == 'getAllOrders') return getAllOrders();
  if (action == 'getDashboardData') return getDashboardData(e); 
  if (action == 'getRates') return getRatesWithAdmin();
  if (action === 'searchGlobal') {
    return searchGlobal(e.parameter.query);
  }
  return ContentService.createTextOutput("KAFAK Server Running... High-Speed System Active 🚀");
}

function doPost(e) {
  try {
    var params = (typeof e.postData.contents === 'string') ? JSON.parse(e.postData.contents) : e.postData.contents;
    
    if (params.action === "bulkUpdateStatus") return bulkUpdateStatus(params);
    if (params.action === "updateTracking") return updateTracking(params);
    if (params.action === "submit") return submitOrder(params);
    if (params.action === "addExpense") return addExpense(params); 
    if (params.action === "deleteOrder") return deleteOrder(params);
    if (params.action === 'deleteRefund') {
       return deleteRefundExpense(params);
    }
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'message': err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 🚀 ULTRA-FAST HELPER: TextFinder for exact match
function findRowIndex(sheet, searchText, columnIndex) {
  var range = sheet.getRange(1, columnIndex, sheet.getLastRow() || 1, 1);
  var finder = range.createTextFinder(searchText).matchEntireCell(true).findNext();
  return finder ? finder.getRow() : -1;
}

// 🚀 FAST HELPER: Array Search (Best for phone numbers with quotes)
function findRowIndexByPhone(sheet, phone, colIndex) {
  var lastRow = sheet.getLastRow();
  if(lastRow < 1) return -1;
  var colData = sheet.getRange(1, colIndex, lastRow, 1).getValues();
  var target = String(phone).trim();
  for (var i = colData.length - 1; i >= 0; i--) {
      if (String(colData[i][0]).replace(/'/g, "").trim() === target) {
          return i + 1;
      }
  }
  return -1;
}

function getSettingsMap() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Settings");
  if (!sheet) return {};
  var data = sheet.getDataRange().getValues();
  data.shift(); // Remove Header
  
  return data.reduce((acc, row) => {
    var key = String(row[2]).trim(); 
    if(key) acc[key] = { rateStr: row[3], provider: row[4], extraFee: Number(row[5]) || 0 };
    return acc;
  }, {});
}

function calculateSmartRate(qty, settingData) {
  if (!settingData) return { cost: 0, provider: "" };
  var val = String(settingData.rateStr).trim();
  var cost = 0;

  if (val.includes(":")) {
    var rates = val.split(",").reduce((acc, p) => {
      var pair = p.trim().split(":");
      if (pair.length === 2) acc[parseInt(pair[0])] = parseInt(pair[1]);
      return acc;
    }, {});
    cost = rates[qty] || 0;
  } else if (!isNaN(parseFloat(val))) {
    cost = parseFloat(val) * qty;
  }
  cost += settingData.extraFee;
  return { cost: cost, provider: settingData.provider };
}

// --- CORE FUNCTIONS ---

function submitOrder(params) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var orderSheet = doc.getSheetByName("Orders");
    var custSheet = doc.getSheetByName("Customers");
    var data = params.orderData;
    var timestamp = new Date();
    
    // Settings & Rates Calculation (Logic Kept Same)
    var settings = getSettingsMap();
    var state = String(data.state || '').trim().toUpperCase();
    var qty = parseInt(data.quantity) || 1;
    var zoneMap = { "TN": "TAMIL NADU", "KA": "KARNATAKA", "KL": "KERALA", "AP": "ANDHRA PRADESH", "TS": "TELANGANA" };
    var zoneKey = settings[state] ? state : (zoneMap[state] || "REST OF INDIA");
    var rates = getRatesFromSettings();
    var itemTotal = (rates.prices && rates.prices[qty]) ? rates.prices[qty] : (rates.prices[1] || 650) * qty;
    var rateResult = calculateSmartRate(qty, settings[zoneKey]);
    var grandTotal = itemTotal + rateResult.cost;

    // 🔥 K-26... format (Year 2 digits only)
    var orderId = data.orderid || "K-" + Utilities.formatDate(timestamp, Session.getScriptTimeZone(), "yyMMddHHmmss");
    var custId = data.custId || "USER-" + Math.floor(100000 + Math.random() * 900000);

    // 🔥 SMART HEADER MAPPING FOR SAVING
    // ഷീറ്റിലെ ഹെഡർ എന്താണോ, അതിലേക്ക് ഡാറ്റ മാപ്പ് ചെയ്യുന്നു
    var headers = orderSheet.getRange(1, 1, 1, orderSheet.getLastColumn()).getValues()[0];
    var newRow = new Array(headers.length).fill(""); 

    var map = {
      "Order ID": orderId, 
      "Date": timestamp, // ഇവിടെ 'Date' എന്ന് തന്നെ കൊടുത്തു
      "Name": data.name, 
      "Phone": "'" + data.phone,
      "House": data.house, 
      "Place": data.place, 
      "Post Office": data.postoffice,
      "Pincode": data.pincode, 
      "District": data.district, 
      "State": data.state,
      "WhatsApp": "'" + data.whatsapp, 
      "Alt Phone": "'" + (data.altphone || ""),
      "Quantity": data.quantity, 
      "Message": data.message, 
      "Status": "Pending",
      "Product_Amount": itemTotal, //
      "Courier_Charge": rateResult.cost, //
      "Grand_Total": grandTotal, //
      "Courier_Provider": rateResult.provider, //
      "Language": (data.language && data.language !== "") ? data.language : 'en',
      "Admin Meta": "" 
    };

    // ഹെഡർ നോക്കി വാല്യൂ ഫിൽ ചെയ്യുന്നു
    for (var i = 0; i < headers.length; i++) {
      if (map[headers[i]] !== undefined) newRow[i] = map[headers[i]];
    }

    // Row സേവ് ചെയ്യുന്നു
    var rowIndex = findRowIndex(orderSheet, orderId, 1);
    if (rowIndex > -1) {
      // നിലവിലുള്ള ഓർഡർ ആണെങ്കിൽ പഴയ ചില വിവരങ്ങൾ (Status/Tracking) നിലനിർത്തണം
      var oldRow = orderSheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
      var statusIdx = headers.indexOf("Status");
      var trackIdx = headers.indexOf("Tracking ID");
      if(statusIdx > -1) newRow[statusIdx] = oldRow[statusIdx];
      if(trackIdx > -1) newRow[trackIdx] = oldRow[trackIdx];
      
      orderSheet.getRange(rowIndex, 1, 1, newRow.length).setValues([newRow]);
    } else {
      orderSheet.appendRow(newRow);
    }

    updateCustomerData(custSheet, data, custId);

    return ContentService.createTextOutput(JSON.stringify({ 
      'result': 'success', 'orderid': orderId, 'custId': custId, 'timestamp': timestamp.toISOString() 
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function updateCustomerData(sheet, data, custId) {
  var phone = String(data.phone);
  var rowIndex = -1;
  
  if(custId) rowIndex = findRowIndex(sheet, custId, 11);
  if(rowIndex === -1) rowIndex = findRowIndexByPhone(sheet, phone, 1);
  
  var totalOrders = 0, totalBottles = 0, currentOffer = "";
  if (rowIndex > -1) {
    var existingData = sheet.getRange(rowIndex, 1, 1, 14).getValues()[0];
    totalOrders = existingData[11] || 0;
    totalBottles = existingData[12] || 0;
    currentOffer = existingData[13] || "";
  }

  var custRow = [
    "'" + phone, data.name, data.house, data.place, data.postoffice, 
    data.pincode, data.district, data.state, "'" + data.whatsapp, 
    "'" + (data.altphone || ""), custId, totalOrders, totalBottles,
    currentOffer, data.language || 'en'
  ];

  if (rowIndex > -1) { 
      sheet.getRange(rowIndex, 1, 1, custRow.length).setValues([custRow]);
  } else { 
      sheet.appendRow(custRow);
  }
}

// 🚀 HIGH SPEED: MEMORY BATCH PROCESSING (No loops with getValues)
function updateCustomerStatsBatch(sheetOrders, sheetCustomers, completedOids, idMap) {
  if(completedOids.length === 0) return;
  
  var oData = sheetOrders.getDataRange().getValues();
  
  // Find phones that need update
  var phonesToUpdate = [];
  completedOids.forEach(oid => {
    var rIdx = idMap[oid];
    if (rIdx && oData[rIdx-1]) phonesToUpdate.push(String(oData[rIdx-1][3]).replace("'","").trim());
  });
  phonesToUpdate = [...new Set(phonesToUpdate)]; // Unique phones
  
  // Calculate stats in memory
  var phoneStats = {};
  phonesToUpdate.forEach(p => phoneStats[p] = { count: 0, bottles: 0 });
  
  oData.forEach(row => {
    var p = String(row[3]).replace("'","").trim();
    var status = String(row[14]);
    if (phoneStats[p] && (status === 'Completed' || status === 'Delivered')) {
       phoneStats[p].count++;
       phoneStats[p].bottles += (parseInt(row[12]) || 0);
    }
  });

  // Write back specific rows
  var cPhones = sheetCustomers.getRange(1, 1, sheetCustomers.getLastRow(), 1).getValues().flat().map(p => String(p).replace("'","").trim());
  phonesToUpdate.forEach(p => {
    var cIdx = cPhones.lastIndexOf(p);
    if (cIdx > -1) {
      sheetCustomers.getRange(cIdx + 1, 12, 1, 2).setValues([[ phoneStats[p].count, phoneStats[p].bottles ]]);
    }
  });
}

// 🚀 FAST GET CUSTOMER USING TEXTFINDER
// 🚀 FAST GET CUSTOMER (Fixed Date Issue)
function getCustomer(e) {
  var phone = e.parameter.phone;
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var custSheet = doc.getSheetByName("Customers");
  var orderSheet = doc.getSheetByName("Orders");
  
  var responseData = {};
  var rowIndex = findRowIndexByPhone(custSheet, phone, 1);
  
  if(rowIndex > -1) {
      var r = custSheet.getRange(rowIndex, 1, 1, 15).getValues()[0];
      responseData = { 
          phone: String(r[0]).replace("'",""), name: r[1], house: r[2], place: r[3], 
          postoffice: r[4], pincode: r[5], district: r[6], state: r[7], 
          whatsapp: String(r[8]).replace("'",""), altphone: String(r[9]).replace("'",""), 
          custId: r[10], authorized: true, offer: (String(r[13]).toLowerCase() === 'true'), 
          total_bottles: r[12], language: (r[14] && String(r[14]).trim() !== "") ? r[14] : "en",
      };
  } else {
      responseData = { phone: phone, authorized: false };
  }

  // Find last order
  var tf = orderSheet.getRange("D:D").createTextFinder(phone).matchEntireCell(false).findAll();
  if (tf.length > 0) {
      var lastRowIdx = tf[tf.length - 1].getRow();
      
      // 🔥 FIX: Fetch ALL columns to get Dates at the end
      var lastCol = orderSheet.getLastColumn();
      var foundOrder = orderSheet.getRange(lastRowIdx, 1, 1, lastCol).getValues()[0];
      var headers = orderSheet.getRange(1, 1, 1, lastCol).getValues()[0]; // Get Headers to find Index

      // Find Date Columns dynamically
      var paidIdx = headers.indexOf("Paid Date");
      var dispIdx = headers.indexOf("Dispatched Date");

      var status = foundOrder[14]; 
      
      responseData.Status = status;
      responseData.date = foundOrder[1]; // Order Date
      
      // 🔥 FIX: Add Missing Dates
      responseData.paidDate = (paidIdx > -1) ? foundOrder[paidIdx] : "";
      responseData["Dispatched Date"] = (dispIdx > -1) ? foundOrder[dispIdx] : "";

      if(['Dispatched', 'Completed', 'Delivered'].includes(status)) {
          responseData.tracking = foundOrder[15];
          responseData.courier = foundOrder[19];
      } else if(responseData.authorized) {
          responseData.orderid = foundOrder[0];
          responseData.quantity = foundOrder[12];
          responseData.message = foundOrder[13];
      }
  }

  return ContentService.createTextOutput(JSON.stringify({ result: 'success', data: responseData })).setMimeType(ContentService.MimeType.JSON);
}

function getOrderDetails(e) {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = doc.getSheetByName("Orders");
  var custSheet = doc.getSheetByName("Customers");
  var rowIndex = findRowIndex(sheet, e.parameter.oid, 1);
  
  if(rowIndex > -1) {
      var r = sheet.getRange(rowIndex, 1, 1, 20).getValues()[0];
      var orderPhone = String(r[3]).replace("'","");
      var custId = null, hasOffer = false; 

      var custRow = findRowIndexByPhone(custSheet, orderPhone, 1);
      if(custRow > -1) {
          var cData = custSheet.getRange(custRow, 1, 1, 14).getValues()[0];
          custId = cData[10];
          hasOffer = (String(cData[13]).toLowerCase() === 'true');
      }

      return ContentService.createTextOutput(JSON.stringify({ 
        result: 'success', 
        data: { 
            orderid: r[0], date: r[1], name: r[2], phone: orderPhone, house: r[4], 
            place: r[5], postoffice: r[6], pincode: r[7], district: r[8], state: r[9], 
            whatsapp: r[10], altphone: r[11], quantity: r[12], message: r[13], 
            Status: r[14], tracking: r[15], grandTotal: r[18], courier: r[19], 
            custId: custId, offer: hasOffer 
        } 
      })).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({ result: 'error' })).setMimeType(ContentService.MimeType.JSON);
}

// 🔥 UPDATED: GET ALL ORDERS (With Customer Language Lookup)
function getAllOrders() { 
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = doc.getSheetByName("Orders");
  var custSheet = doc.getSheetByName("Customers"); // കസ്റ്റമർ ഷീറ്റ് വിളിക്കുന്നു

  if (!sheet || sheet.getLastRow() < 2) {
    return ContentService.createTextOutput(JSON.stringify({ result: 'success', data: [] })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // 1. കസ്റ്റമർ ഷീറ്റിലെ ഫോൺ നമ്പറും ഭാഷയും എടുത്ത് വെക്കുന്നു
  var custLangMap = {};
  if (custSheet && custSheet.getLastRow() > 1) {
    var cData = custSheet.getDataRange().getValues();
    // Customers ഷീറ്റിൽ: Column A (0) = Phone, Column O (14) = Language
    for (var i = 1; i < cData.length; i++) {
       var p = String(cData[i][0]).replace(/'/g, "").trim(); // Phone
       var l = cData[i][14]; // Language Column (15th column is index 14)
       if (p) custLangMap[p] = l;
    }
  }

  var data = sheet.getDataRange().getValues();
  var headers = data[0]; 
  
  var idx = {
    oid: headers.indexOf("Order ID"),
    time: headers.indexOf("Date"),
    name: headers.indexOf("Name"),
    phone: headers.indexOf("Phone"),
    house: headers.indexOf("House"),
    place: headers.indexOf("Place"),
    post: headers.indexOf("Post Office"),
    pin: headers.indexOf("Pincode"),
    dist: headers.indexOf("District"),
    state: headers.indexOf("State"),
    wa: headers.indexOf("WhatsApp"),
    alt: headers.indexOf("Alt Phone"),
    qty: headers.indexOf("Quantity"),
    status: headers.indexOf("Status"),
    track: headers.indexOf("Tracking ID"),
    cost: headers.indexOf("Actual_Courier_Cost"),
    meta: headers.indexOf("Admin Meta"), 
    paidDate: headers.indexOf("Paid Date"),
    dispDate: headers.indexOf("Dispatched Date")
  };

  var rows = data.slice(1);
  var validData = rows.filter(function(row) { return row[idx.oid] && String(row[idx.oid]).trim() !== ""; });
  var recentData = validData.length > 500 ? validData.slice(-500) : validData;

  var orders = recentData.map(function(row) { 
    // 2. ഓർഡറിലെ ഫോൺ നമ്പർ വെച്ച് മാപ്പിൽ നിന്ന് ഭാഷ എടുക്കുന്നു
    var phone = String(row[idx.phone]).replace(/'/g, "").trim();
    
    // 🔥 ഇവിടെയാണ് മാജിക്: കസ്റ്റമർ ഷീറ്റിലെ ഭാഷ നേരിട്ട് എടുക്കുന്നു
    var finalLang = custLangMap[phone] || "en"; 

    return {
      orderid: row[idx.oid], 
      timestamp: row[idx.time], 
      name: row[idx.name], 
      phone: row[idx.phone],
      house: row[idx.house], place: row[idx.place], postoffice: row[idx.post], 
      pincode: row[idx.pin], district: row[idx.dist], state: row[idx.state], 
      whatsapp: row[idx.wa], altphone: row[idx.alt], 
      quantity: row[idx.qty], 
      Status: row[idx.status], 
      tracking: (idx.track > -1) ? String(row[idx.track]) : "",
      actualCourierCost: (idx.cost > -1) ? (row[idx.cost] || 0) : 0,
      adminMeta: (idx.meta > -1) ? String(row[idx.meta]) : "", 
      
      language: finalLang, // 🔥 കസ്റ്റമർ ഷീറ്റിലെ ഭാഷ വരും
      
      paidDate: (idx.paidDate > -1) ? row[idx.paidDate] : "",
      "Dispatched Date": (idx.dispDate > -1) ? row[idx.dispDate] : ""
    };
  }).reverse();

  return ContentService.createTextOutput(JSON.stringify({ result: 'success', data: orders })).setMimeType(ContentService.MimeType.JSON);
}

// 🚀 HIGH SPEED BULK UPDATE
// 🚀 HIGH SPEED BULK UPDATE (Fixed: Now Saves Admin Meta)
function bulkUpdateStatus(params) {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = doc.getSheetByName("Orders");
  var custSheet = doc.getSheetByName("Customers");
  
  var allIds = sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues().flat();
  var idMap = allIds.reduce((acc, id, idx) => { acc[String(id)] = idx + 1; return acc; }, {});
  var updates = params.updates; 
  
  if(!updates || updates.length === 0) return ContentService.createTextOutput(JSON.stringify({ result: 'success', count: 0 })).setMimeType(ContentService.MimeType.JSON);
  
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // 🔥 Column Indexes കണ്ടുപിടിക്കുന്നു
  var paidDateCol = headers.indexOf("Paid Date") + 1;
  var dispDateCol = headers.indexOf("Dispatched Date") + 1;
  var metaCol = headers.indexOf("Admin Meta") + 1; // 🔥 Meta Column
  var msgCol = 14; 

  var successCount = 0;
  var completedIds = [];

  updates.forEach(function(item) {
    var rowIndex = idMap[item.oid]; 
    if (rowIndex) {
        
        // 🔥 CASE 1: വെറും Meta Update ആണെങ്കിൽ (Print ചെയ്യുമ്പോൾ നടക്കുന്നത്)
        if (item.action === 'meta') {
            if (metaCol > 0 && item.meta !== undefined) {
                sheet.getRange(rowIndex, metaCol).setValue(item.meta);
            }
        } 
        // 🔥 CASE 2: Status Update ആണെങ്കിൽ
        else {
            sheet.getRange(rowIndex, 15).setValue(item.status);
            
            // Archive Reason
            if (item.status === 'Archive' && item.reason) {
                var oldMsg = sheet.getRange(rowIndex, msgCol).getValue();
                var newMsg = oldMsg + " [ARCHIVED: " + item.reason + "]";
                sheet.getRange(rowIndex, msgCol).setValue(newMsg);
            }

            // Handle Dates
            if (item.status === 'Paid' && item.actionDate && paidDateCol > 0) {
                sheet.getRange(rowIndex, paidDateCol).setValue(item.actionDate);
            }
            if (item.status === 'Dispatched' && dispDateCol > 0) {
                let dDate = item.actionDate || new Date(); 
                if (typeof dDate === 'object') dDate = Utilities.formatDate(dDate, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
                sheet.getRange(rowIndex, dispDateCol).setValue(dDate);
            }

            // Stats Recalculation Trigger
            if (['Completed', 'Delivered', 'Archive'].includes(item.status)) {
                completedIds.push(item.oid);
            }
        }
        successCount++;
    }
  });

  // Batch Update Stats
  if(completedIds.length > 0) {
    updateCustomerStatsBatch(sheet, custSheet, completedIds, idMap);
  }

  return ContentService.createTextOutput(JSON.stringify({ 'result': 'success', 'count': successCount })).setMimeType(ContentService.MimeType.JSON);
}

// 🚀 BATCH ARRAY UPDATE FOR TRACKING
function updateTracking(params) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Orders");
  var rowIndex = findRowIndex(sheet, params.oid, 1);
  if (rowIndex > -1) {
    // Write Status and Tracking ID together in one shot
    sheet.getRange(rowIndex, 15, 1, 2).setValues([["Dispatched", params.tracking]]);
    
    // Add Dispatch Date
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var dispDateCol = headers.indexOf("Dispatched Date") + 1;
    if(dispDateCol > 0) {
        var dDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
        sheet.getRange(rowIndex, dispDateCol).setValue(dDate);
    }
    return ContentService.createTextOutput(JSON.stringify({ result: 'success' })).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({ result: 'error' })).setMimeType(ContentService.MimeType.JSON);
}

// 🔥 DYNAMIC RATES: ഷീറ്റിലെ സംസ്ഥാനത്തിന്റെ പേര് അതേപോലെ എടുക്കുന്നു
function getRatesFromSettings() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings');
  var data = sheet.getDataRange().getValues();
  data.shift(); // Remove Header

  // Helper to process rate string
  var processRates = (rateStr, serviceFeeStr) => {
    if (!rateStr) return {};
    var serviceMap = {};
    if (String(serviceFeeStr).includes(":")) {
       String(serviceFeeStr).split(',').forEach(s => {
          var p = s.split(':');
          if(p.length===2) serviceMap[p[0].trim()] = Number(p[1].trim());
       });
    } else {
       var fixedFee = Number(serviceFeeStr) || 0;
       serviceMap['default'] = fixedFee;
    }

    return String(rateStr).split(',').reduce((acc, item) => {
      var parts = item.split(':');
      if (parts.length === 2) {
        var qty = parts[0].trim();
        var baseRate = Number(parts[1].trim());
        var sCharge = (serviceMap[qty] !== undefined) ? serviceMap[qty] : (serviceMap['default'] || 0);
        acc[qty] = baseRate + sCharge;
      }
      return acc;
    }, {});
  };
  
  // 🔥 NO HARDCODED MAP: ഷീറ്റിലെ പേര് (Column C) കീ ആയി ഉപയോഗിക്കുന്നു
  return data.reduce((acc, row) => {
      var qtyLabel = String(row[0]); 
      var price = Number(row[1]); 
      var qtyMatch = qtyLabel.match(/^(\d+)/);
      if (qtyMatch && price) acc.prices[qtyMatch[1]] = price;

      var sheetZoneName = String(row[2]).trim().toUpperCase(); // e.g., "KERALA", "KARNATAKA"
      var rateStr = String(row[3]).trim(); 
      var serviceCharge = String(row[5]).trim(); 

      if (sheetZoneName) {
        acc[sheetZoneName] = processRates(rateStr, serviceCharge);
      }
      return acc;
  }, { prices: {} });
}

// 🔥 UPDATED: Dashboard Data (Strict Separation of Sales and Courier Logic)
// 🔥 UPDATED: Dashboard Data (With Previous Balance & Receipt Images)
function getDashboardData(e) {
  var targetDateStr = e.parameter.date;
  var targetDate = new Date(targetDateStr);
  targetDate.setHours(0,0,0,0);
  
  var firstDayOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
  var lastDayOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
  lastDayOfMonth.setHours(23, 59, 59, 999);

  var realToday = new Date();
  if (lastDayOfMonth > realToday) {
      lastDayOfMonth = realToday;
      lastDayOfMonth.setHours(23, 59, 59, 999);
  }
  
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var tz = Session.getScriptTimeZone(); 
  
  var orderSheet = doc.getSheetByName("Orders");
  var expSheet = doc.getSheetByName("Expenses");
  var auditSheet = doc.getSheetByName("Auditor_Report");

  var oData = orderSheet.getDataRange().getValues(); 
  var headers = oData.shift();
  var paidIdx = headers.indexOf("Paid Date");
  var dispIdx = headers.indexOf("Dispatched Date");

  var eData = expSheet.getDataRange().getValues(); eData.shift();
  var aData = auditSheet.getDataRange().getValues(); aData.shift();

  var stats = {
    daily: { sales: 0, courier: 0, expense: 0, profit: 0, count: 0, list: [] },
    monthly: { sales: 0, expense: 0, courier: 0, profit: 0 },
    yearly: { materialExp: 0 }, // 🔥 NEW: Yearly കണക്കുകൾ എടുക്കാൻ
    partners: { 
        "Salam": { curr: 0, prev: 0 }, 
        "Samad": { curr: 0, prev: 0 }, 
        "Jazeela": { curr: 0, prev: 0 } 
    },
    monthTimeline: { income: {}, expense: [] } 
  };

  oData.forEach(row => {
    var status = String(row[14]);
    var isPaidOrMore = ['Paid', 'Dispatched', 'Completed', 'Delivered'].includes(status);
    var isDispatchedOrMore = ['Dispatched', 'Completed', 'Delivered'].includes(status);

    if (isPaidOrMore || isDispatchedOrMore) {
      var sales = isPaidOrMore ? (Number(row[18]) || 0) : 0;
      var courier = isDispatchedOrMore ? (Number(row[20]) || 0) : 0; 
      var qty = parseInt(row[12]) || 0; 

      if (isPaidOrMore) {
          var pDateRaw = paidIdx > -1 ? row[paidIdx] : "";
          var pDate = pDateRaw ? new Date(pDateRaw) : new Date(row[1]);
          pDate.setHours(0,0,0,0);

          if (pDate >= firstDayOfMonth && pDate <= lastDayOfMonth) {
              stats.monthly.sales += sales;
              var pKey = Utilities.formatDate(pDate, tz, "yyyy-MM-dd");
              if(!stats.monthTimeline.income[pKey]) stats.monthTimeline.income[pKey] = { bottles: 0, amount: 0 };
              stats.monthTimeline.income[pKey].bottles += qty;
              stats.monthTimeline.income[pKey].amount += sales;
          }
          if (pDate.getTime() === targetDate.getTime()) {
            stats.daily.sales += sales;
            stats.daily.count++;
          }
      }

      if (isDispatchedOrMore) {
          var dDateRaw = dispIdx > -1 ? row[dispIdx] : "";
          var dDate = dDateRaw ? new Date(dDateRaw) : new Date(row[1]);
          dDate.setHours(0,0,0,0);

          if (dDate >= firstDayOfMonth && dDate <= lastDayOfMonth) {
              stats.monthly.courier += courier;
              if (courier > 0) {
                  var dKey = Utilities.formatDate(dDate, tz, "yyyy-MM-dd");
                  stats.monthTimeline.expense.push({ date: dKey, desc: 'Sent by courier', vendor: 'Auto', amount: courier, isCourier: true });
              }
          }
          if (dDate.getTime() === targetDate.getTime()) {
            stats.daily.courier += courier;
          }
      }
    }
  });

  stats.monthly.profit = stats.monthly.sales - stats.monthly.courier;
  stats.daily.profit = stats.daily.sales - stats.daily.courier;

  // Expenses Logic
  eData.forEach(row => {
    var d = new Date(row[0]); d.setHours(0,0,0,0);
    var cat = String(row[1]);
    var vendor = String(row[2]).trim();
    var desc = String(row[3]).trim();
    var amount = Number(row[4]) || 0;
    var proof = row[7] || ""; 

    // Yearly Material Calculation
    if (d.getFullYear() === targetDate.getFullYear()) {
        if (cat.toLowerCase().includes('material')) {
            stats.yearly.materialExp += amount;
        }
    }

    // 🔥 FIX: സാലറിയും മെറ്റീരിയലും കമ്പനിയുടെ ലാഭത്തിൽ നിന്നും കുറയ്ക്കില്ല!
    let isMaterial = cat.toLowerCase().includes('material');
    let isSalary = (cat === 'Salary');
    let isDeductibleExp = !isMaterial && !isSalary; 

    if (d >= firstDayOfMonth && d <= lastDayOfMonth) {
      if (isDeductibleExp) {
          stats.monthly.expense += amount;
          stats.monthly.profit -= amount;
      }
      var eKey = Utilities.formatDate(d, tz, "yyyy-MM-dd");
      stats.monthTimeline.expense.push({ date: eKey, desc: desc || cat, vendor: vendor, amount: amount, isCourier: false, cat: cat, proof: proof });
    }
    
    if (d.getTime() === targetDate.getTime()) {
      if (isDeductibleExp) {
          stats.daily.expense += amount;
          stats.daily.profit -= amount;
      }
      stats.daily.list.push({ category: cat, desc: desc, amount: amount, proof: proof });
    }

    // Salary partner deduction logic
    if (cat === "Salary") {
      var vLower = vendor.toLowerCase();
      var dLower = desc.toLowerCase();
      var matchedPartner = null;
      
      if (vLower.includes("salam") || dLower.includes("salam")) matchedPartner = "Salam";
      else if (vLower.includes("samad") || dLower.includes("samad")) matchedPartner = "Samad";
      else if (vLower.includes("jazeela") || dLower.includes("jazeela")) matchedPartner = "Jazeela";

      if (matchedPartner) {
          stats.partners[matchedPartner].curr -= amount;
          if (d < firstDayOfMonth) {
              stats.partners[matchedPartner].prev -= amount; 
          }
      }
    }
  });

  // Auditor Report Additions
  aData.forEach(row => {
    var s1 = Number(row[6]) || 0;  
    var s2 = Number(row[7]) || 0;  
    var s3 = Number(row[8]) || 0; 
    
    stats.partners["Salam"].curr += s1;  stats.partners["Salam"].prev += s1;
    stats.partners["Samad"].curr += s2;  stats.partners["Samad"].prev += s2;
    stats.partners["Jazeela"].curr += s3; stats.partners["Jazeela"].prev += s3;
  });

  return ContentService.createTextOutput(JSON.stringify({ result: 'success', data: stats })).setMimeType(ContentService.MimeType.JSON);
}

// 🔥 UPDATED: ADD EXPENSE (Updates Order Status to 'Refunded' automatically)
function addExpense(params) {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = doc.getSheetByName("Expenses");
  var data = params.data;
  
  var proofUrl = "";
  if (data.fileData && data.fileName) {
    try {
      proofUrl = saveImageToDrive(data.fileData, data.fileName);
    } catch(e) {
      proofUrl = "Error: " + e.toString();
    }
  }
  var expDate = data.date ? new Date(data.date) : new Date();
  
  sheet.appendRow([
    expDate,
    data.category,
    data.vendor,
    data.description,
    data.amount,
    data.billRef || "",
    "Admin",
    proofUrl
  ]);

  // 🔥 NEW: റീഫണ്ട് ആണെങ്കിൽ ഓർഡർ ഷീറ്റിലെ സ്റ്റാറ്റസ് 'Refunded' എന്ന് മാറ്റുന്നു
  if (data.category === 'Refund' && data.orderId) {
      var orderSheet = doc.getSheetByName("Orders");
      // ഓർഡർ ഐഡി വെച്ച് വരി കണ്ടുപിടിക്കുന്നു (Column A ൽ ആണ് ID എന്ന് കരുതുന്നു)
      var rowIndex = findRowIndex(orderSheet, data.orderId, 1); 
      
      if (rowIndex > -1) {
          // Status കിടക്കുന്നത് 15-ാമത്തെ കോളത്തിൽ (Column O) ആണെന്ന് ഉറപ്പാക്കുക
          orderSheet.getRange(rowIndex, 15).setValue("Refunded");
      }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ result: 'success' })).setMimeType(ContentService.MimeType.JSON);
}

function saveImageToDrive(base64Data, fileName) {
  var folderName = "KAFAK_EXPENSE_PROOFS";
  var folders = DriveApp.getFoldersByName(folderName);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
  
  var contentType = base64Data.substring(5, base64Data.indexOf(';'));
  var bytes = Utilities.base64Decode(base64Data.substr(base64Data.indexOf('base64,')+7));
  var blob = Utilities.newBlob(bytes, contentType, fileName);
  
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

function fixPermissions() {
  DriveApp.getRootFolder();
  console.log("Permission Fixed!");
}

function setColumnValueByHeader(sheet, rowIndex, headerName, value) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var colIndex = headers.indexOf(headerName);
  if (colIndex > -1) sheet.getRange(rowIndex, colIndex + 1).setValue(value);
}

// 🔥 FIXED: GLOBAL SEARCH FUNCTION
function searchGlobal(query) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Orders");
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var results = [];
  var q = String(query).toLowerCase().trim();
  
  // Date Column Indexes കണ്ടുപിടിക്കുന്നു
  var paidDateIdx = headers.indexOf("Paid Date");
  var dispDateIdx = headers.indexOf("Dispatched Date");

  // Row 2 മുതൽ താഴേക്ക് തിരയുന്നു
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    
    // OrderID (0), Name (2), Phone (3), Tracking (15) എന്നിവയിൽ തിരയുന്നു
    // Note: Column Index 0-based ആണ് (Phone is Column D -> Index 3)
    if (
       String(row[0]).toLowerCase().includes(q) || // Order ID
       String(row[2]).toLowerCase().includes(q) || // Name
       String(row[3]).includes(q) ||               // Phone (Column D)
       String(row[15]).toLowerCase().includes(q)   // Tracking ID (Column P)
    ) {
       // Create Order Object Manually
       var orderObj = {
          orderid: row[0], timestamp: row[1], name: row[2], phone: row[3],
          house: row[4], place: row[5], postoffice: row[6], pincode: row[7],
          district: row[8], state: row[9], whatsapp: row[10], 
          altphone: row[11], quantity: row[12], 
          Status: row[14], tracking: row[15] || "",
          grandTotal: row[18], provider: row[19],
          actualCourierCost: row[20] || 0,
          paidDate: (paidDateIdx > -1) ? row[paidDateIdx] : "",
          "Dispatched Date": (dispDateIdx > -1) ? row[dispDateIdx] : ""
       };
       results.push(orderObj);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ result: 'success', orders: results })).setMimeType(ContentService.MimeType.JSON);
}

// 🔥 DELETE REFUND FROM EXPENSES SHEET
function deleteRefundExpense(data) {
  var oid = data.oid;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Expenses");
  var rows = sheet.getDataRange().getValues();
  
  // താഴെ നിന്നും മുകളിലേക്ക് പരിശോധിക്കുന്നു (Row ഡിലീറ്റ് ചെയ്യുമ്പോൾ പ്രശ്നം വരാതിരിക്കാൻ)
  for (var i = rows.length - 1; i >= 0; i--) {
    var row = rows[i];
    // Column B (Category) = Refund ആണോ എന്നും, Column C/D യിൽ ഓർഡർ ഐഡി ഉണ്ടോ എന്നും നോക്കുന്നു
    var category = String(row[1]); 
    var vendor = String(row[2]);
    var desc = String(row[3]);

    if (category === 'Refund' && (vendor.includes(oid) || desc.includes(oid))) {
      sheet.deleteRow(i + 1); // Row നമ്പർ (Index + 1) വെച്ച് ഡിലീറ്റ് ചെയ്യുന്നു
      return ContentService.createTextOutput(JSON.stringify({ result: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ result: 'not_found' })).setMimeType(ContentService.MimeType.JSON);
}

// 🔥 NEW OPTIMIZED FUNCTION (No Loop)
function getRatesWithAdmin() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var rates = getRatesFromSettings(); // പഴയ Rates എടുക്കുന്നു
  
  var adminSheet = ss.getSheetByName("Admins");
  var adminPhone = "7788990313"; // Default Fallback

  if (adminSheet) {
    // 'findRowIndex' ഉപയോഗിച്ച് ഒറ്റയടിക്ക് അഡ്മിനെ കണ്ടുപിടിക്കുന്നു (Fastest Way)
    var rowIndex = findRowIndex(adminSheet, "admin", 1); 

    if (rowIndex > -1) {
      // Row കിട്ടിയാൽ, Column 5-ൽ (Phone) ഉള്ള വാല്യൂ എടുക്കുന്നു
      adminPhone = String(adminSheet.getRange(rowIndex, 5).getValue());
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ 
    result: 'success', 
    rates: rates, 
    adminPhone: adminPhone 
  })).setMimeType(ContentService.MimeType.JSON);
}

// 🔥 PERMANENT DELETE FUNCTION (Master Admin Only)
function deleteOrder(params) {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = doc.getSheetByName("Orders");
  var rowIndex = findRowIndex(sheet, params.oid, 1); // ID വെച്ച് വരി കണ്ടുപിടിക്കുന്നു

  if (rowIndex > -1) {
    sheet.deleteRow(rowIndex); // വരി പൂർണ്ണമായും നീക്കം ചെയ്യുന്നു
    return ContentService.createTextOutput(JSON.stringify({ result: 'success' })).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({ result: 'error', message: 'Order not found' })).setMimeType(ContentService.MimeType.JSON);
}