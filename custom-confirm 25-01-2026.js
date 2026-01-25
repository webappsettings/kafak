const cd = 'AKfycbx0vIfeeIQXffYoILxyexwoVd9Oli9Yv_Dw0mIIB1T9RstV-D6A-wpGTN0DcsD9LIL06A'; // Your Script ID
const sc = `https://script.google.com/macros/s/${cd}/exec`;

// 1. New Courier Rates Table
const courierRates = {
    kerala: {
        1: 80,
        2: 140, //160   
        3: 190, //240 
        4: 240, //320  
        5: 290, //400 
        6: 340,// 480
        8: 480, //480
        10: 500
    },
    outside: {
        1: 110,
        2: 200,
        3: 280,
        4: 350,
        5: 430,
        6: 510,
        8: 640,
        10: 840
    }
};

fetch(`${sc}?action=list`)
    .then(res => res.json())
    .then(data => {
        const container = document.getElementById('order-list');

        // Check if rows exist
        if (!data.rows || data.rows.length === 0) {
            container.innerHTML = '<p>No pending orders found.</p>';
            return;
        }

        data.rows.forEach((row, index) => {
            const wrapper = document.createElement('div');
            const rowIndex = row.rowNumber;
            wrapper.innerHTML = `
        <div>
          ${formatTimestamp(row.timestamp)}<br>
          <b>${row.name}</b> - ${row.phone}<br>
          Qty: ${row.quantity}<br>
          State: <b>${row.state}</b><br> <button onclick='sendConfirmation(${JSON.stringify(row)})'>Confirm via WhatsApp</button>
          <button onclick='markConfirmed(${rowIndex}, this)'>Mark as Confirmed</button>
        </div><hr>`;
            container.appendChild(wrapper);
        });
    })
    .catch(err => {
        console.error('Error loading orders:', err);
        document.getElementById('order-list').innerHTML = '<p>Error loading data.</p>';
    });


function markConfirmed(rowIndex, btn) {
    // Disable button immediately to prevent double clicks
    btn.disabled = true;
    btn.textContent = 'Processing...';

    fetch(`${sc}?action=confirm&row=${rowIndex}`)
        .then(res => res.json())
        .then(data => {
            if (data.result === 'success') {
                btn.textContent = '✅ Confirmed';
                btn.style.backgroundColor = '#28a745';
                // Optional: Remove the row from view
                // btn.parentElement.style.display = 'none';
            } else {
                alert('Failed to mark as confirmed.');
                btn.disabled = false;
                btn.textContent = 'Mark as Confirmed';
            }
        })
        .catch(() => {
            alert('Error while marking confirmation.');
            btn.disabled = false;
            btn.textContent = 'Mark as Confirmed';
        });
}

function formatTimestamp(isoString) {
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;

    return `${day}/${month}/${year} ${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
}

// 2. Updated Logic for Amount Calculation
function calculateAmountString(quantityText, stateName) {
    const numberOfBottles = parseInt(quantityText);
    const basePricePerBottle = 650;

    if (isNaN(numberOfBottles)) return '';

    const amount = numberOfBottles * basePricePerBottle;

    // Normalize state name (lowercase and trim)
    const stateVal = String(stateName).trim().toLowerCase();
    let courierCharge = 0;

    if (stateVal === 'kerala') {
        // Use Kerala Rate Table
        courierCharge = courierRates.kerala[numberOfBottles] || 0;
    }
    else if (stateVal === 'lakshadweep') {
        // Lakshadweep: 100 per bottle + 20 Extra
        courierCharge = (numberOfBottles * 100) + 20;
    }
    else {
        // Use Outside Kerala Rate Table
        courierCharge = courierRates.outside[numberOfBottles] || 0;
    }

    return `Amount(₹): ${amount} + ${courierCharge}`;
}

function calculateTotalString(amountString) {
    const numbers = amountString.match(/\d+/g);
    if (!numbers || numbers.length < 2) return '';
    const amount = parseInt(numbers[0]);
    const courierCharge = parseInt(numbers[1]);
    const total = amount + courierCharge;
    return `Total(₹): ${total}/-`;
}

function sendConfirmation(row) {
    console.log(row);
    const whatsapp = row.whatsapp;
    const orderid = row.orderid;
    const submitTime = formatTimestamp(row.timestamp);
    const postLabel = row.officename || row.postoffice || '';

    // 3. Pass row.state to calculation function
    const amountTextW = calculateAmountString(row.quantity, row.state) + ' (Courier)';

    const totalTextW = calculateTotalString(amountTextW);
    const extra1 = `*✅ Honey order confirmed!* 🍯\n🔖 \`\`\`#${orderid}\`\`\`\n🔗 _kafaklife.com/order?o${row.rowNumber}_\n⌚ \`\`\`${submitTime}\`\`\``;
    const msg = row.message ? `\n\n💬 _${String(row.message).trim()}_\n` : '\n';

    const wtspformat = `
____________________________________\n
*${row.name.trim().toUpperCase()}*
*${row.house.trim().toUpperCase()}*
*${row.place.trim().toUpperCase()}*
*${postLabel.trim().toUpperCase()}*
*${row.district.trim().toUpperCase()}*
*${row.state.trim().toUpperCase()}*
*Pin: ${String(row.pincode).trim()}*
*Ph: ${row.phone}*\n
*Qty: ${row.quantity}*
*${amountTextW}*\n
*${totalTextW}*${msg}
____________________________________

*Please GPay to the number below and send the screenshot here. We will pack your order after receiving it.*\n
*(താഴെ കാണുന്ന നമ്പറിലേക്ക് GPay ചെയ്ത് സ്ക്രീന്‍ഷോട്ട് അയക്കൂ.. സ്ക്രീന്‍ഷോട്ട് അയച്ച ശേഷം ഓർഡർ പാക്ക് ചെയ്യും)* 👇
\n*7788990313 (KAFAK LLP)*\n`;

    const message = encodeURIComponent(extra1 + wtspformat);

    const formattedNumber = String(whatsapp).replace(/\D/g, '');
    const withCountryCode = formattedNumber.startsWith('91') ? formattedNumber : '91' + formattedNumber;
    window.open(`whatsapp://send?phone=${withCountryCode}&text=${message}`, '_blank');
}