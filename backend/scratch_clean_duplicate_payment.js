const VendorPayment = require('./models/VendorPayment');

async function clean() {
    const deleted = await VendorPayment.findByIdAndDelete("844635c0-b118-4350-a0b7-73ffd421ee5b");
    console.log("Deleted duplicate payment VPAY-202608-1001:", deleted);
}

clean().catch(console.error);
