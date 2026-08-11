const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const Product = require('./models/Product');
const Vendor = require('./models/Vendor');
const Customer = require('./models/Customer');

const seedData = async () => {
    try {
        console.log('Clearing existing product records & seeding fresh items categorized by Item Type...');

        // 1. Seed Products
        await Product.deleteMany({});
        
        const productsList = [
            // ==========================================
            // 1. RAW MATERIALS (Ingredients & Commodities)
            // ==========================================
            {
                itemCode: 'RM-MILK-001',
                name: 'Fresh Cow Milk',
                itemType: 'Raw Material',
                category: 'Dairy',
                unitOfMeasure: 'Ltr',
                hsnCode: '04011000',
                gstPercent: 5,
                wholesalePrice: 50,
                minimumStockLevel: 500,
                status: 'Active'
            },
            {
                itemCode: 'RM-CREAM-001',
                name: 'Fresh Dairy Cream 35%',
                itemType: 'Raw Material',
                category: 'Dairy',
                unitOfMeasure: 'Kg',
                hsnCode: '04022910',
                gstPercent: 5,
                wholesalePrice: 280,
                minimumStockLevel: 100,
                status: 'Active'
            },
            {
                itemCode: 'RM-SUGAR-001',
                name: 'Refined White Sugar',
                itemType: 'Raw Material',
                category: 'Ingredients',
                unitOfMeasure: 'Kg',
                hsnCode: '17019990',
                gstPercent: 5,
                wholesalePrice: 38,
                minimumStockLevel: 200,
                status: 'Active'
            },
            {
                itemCode: 'RM-GLUC-001',
                name: 'Liquid Glucose Syrup',
                itemType: 'Raw Material',
                category: 'Ingredients',
                unitOfMeasure: 'Kg',
                hsnCode: '17023010',
                gstPercent: 5,
                wholesalePrice: 75,
                minimumStockLevel: 50,
                status: 'Active'
            },
            {
                itemCode: 'RM-VANILLA-001',
                name: 'Natural Vanilla Extract',
                itemType: 'Raw Material',
                category: 'Flavors & Colors',
                unitOfMeasure: 'Ltr',
                hsnCode: '33021010',
                gstPercent: 5,
                wholesalePrice: 1000,
                minimumStockLevel: 10,
                status: 'Active'
            },
            {
                itemCode: 'RM-COCOA-001',
                name: 'Premium Cocoa Powder',
                itemType: 'Raw Material',
                category: 'Flavors & Colors',
                unitOfMeasure: 'Kg',
                hsnCode: '18050000',
                gstPercent: 5,
                wholesalePrice: 420,
                minimumStockLevel: 25,
                status: 'Active'
            },
            {
                itemCode: 'RM-MANGO-001',
                name: 'Alphonso Mango Pulp',
                itemType: 'Raw Material',
                category: 'Flavors & Colors',
                unitOfMeasure: 'Kg',
                hsnCode: '20089911',
                gstPercent: 5,
                wholesalePrice: 160,
                minimumStockLevel: 50,
                status: 'Active'
            },
            {
                itemCode: 'RM-STAB-001',
                name: 'Stabilizer & Emulsifier Blend',
                itemType: 'Raw Material',
                category: 'Ingredients',
                unitOfMeasure: 'Kg',
                hsnCode: '38249900',
                gstPercent: 5,
                wholesalePrice: 520,
                minimumStockLevel: 15,
                status: 'Active'
            },
            {
                itemCode: 'RM-POPCORN-001',
                name: 'Butterfly Popcorn Kernels',
                itemType: 'Raw Material',
                category: 'Popcorn & Snacks',
                unitOfMeasure: 'Kg',
                hsnCode: '10059000',
                gstPercent: 5,
                wholesalePrice: 85,
                minimumStockLevel: 100,
                status: 'Active'
            },
            {
                itemCode: 'RM-BUTTER-001',
                name: 'Salted Processing Butter',
                itemType: 'Raw Material',
                category: 'Dairy',
                unitOfMeasure: 'Kg',
                hsnCode: '04051000',
                gstPercent: 5,
                wholesalePrice: 410,
                minimumStockLevel: 30,
                status: 'Active'
            },
            {
                itemCode: 'RM-FLOUR-001',
                name: 'Refined Wheat Flour (Maida)',
                itemType: 'Raw Material',
                category: 'Bakery & Cookies',
                unitOfMeasure: 'Kg',
                hsnCode: '11010000',
                gstPercent: 5,
                wholesalePrice: 32,
                minimumStockLevel: 150,
                status: 'Active'
            },
            {
                itemCode: 'RM-CHOCOCHIP-001',
                name: 'Dark Chocolate Chips',
                itemType: 'Raw Material',
                category: 'Bakery & Cookies',
                unitOfMeasure: 'Kg',
                hsnCode: '18069020',
                gstPercent: 5,
                wholesalePrice: 380,
                minimumStockLevel: 40,
                status: 'Active'
            },

            // ==========================================
            // 2. PACKING MATERIALS (Inward Supplies)
            // ==========================================
            {
                itemCode: 'PKG-CUP-100',
                name: 'Paper Ice Cream Cup 100ml',
                itemType: 'Packing Materials',
                category: 'Packaging',
                unitOfMeasure: 'Pcs',
                hsnCode: '48236900',
                gstPercent: 5,
                wholesalePrice: 1.8,
                piecesPerBox: 100,
                minimumStockLevel: 1000,
                status: 'Active'
            },
            {
                itemCode: 'PKG-LID-100',
                name: 'Plastic Cup Lid 100ml',
                itemType: 'Packing Materials',
                category: 'Packaging',
                unitOfMeasure: 'Pcs',
                hsnCode: '39235010',
                gstPercent: 5,
                wholesalePrice: 0.6,
                piecesPerBox: 100,
                minimumStockLevel: 1000,
                status: 'Active'
            },
            {
                itemCode: 'PKG-CUP-250',
                name: 'Paper Ice Cream Cup 250ml',
                itemType: 'Packing Materials',
                category: 'Packaging',
                unitOfMeasure: 'Pcs',
                hsnCode: '48236900',
                gstPercent: 5,
                wholesalePrice: 3.2,
                piecesPerBox: 50,
                minimumStockLevel: 500,
                status: 'Active'
            },
            {
                itemCode: 'PKG-LID-250',
                name: 'Plastic Cup Lid 250ml',
                itemType: 'Packing Materials',
                category: 'Packaging',
                unitOfMeasure: 'Pcs',
                hsnCode: '39235010',
                gstPercent: 5,
                wholesalePrice: 0.9,
                piecesPerBox: 50,
                minimumStockLevel: 500,
                status: 'Active'
            },
            {
                itemCode: 'PKG-STICK-01',
                name: 'Wooden Ice Cream Stick',
                itemType: 'Packing Materials',
                category: 'Packaging',
                unitOfMeasure: 'Pcs',
                hsnCode: '44219190',
                gstPercent: 5,
                wholesalePrice: 0.25,
                piecesPerBox: 500,
                minimumStockLevel: 2000,
                status: 'Active'
            },
            {
                itemCode: 'PKG-SPOON-01',
                name: 'Mini Plastic Spoon',
                itemType: 'Packing Materials',
                category: 'Packaging',
                unitOfMeasure: 'Pcs',
                hsnCode: '39241090',
                gstPercent: 5,
                wholesalePrice: 0.3,
                piecesPerBox: 500,
                minimumStockLevel: 2000,
                status: 'Active'
            },
            {
                itemCode: 'PKG-CONE-01',
                name: 'Wafer Cone Shell Medium',
                itemType: 'Packing Materials',
                category: 'Packaging',
                unitOfMeasure: 'Pcs',
                hsnCode: '19053210',
                gstPercent: 5,
                wholesalePrice: 2.2,
                piecesPerBox: 100,
                minimumStockLevel: 1000,
                status: 'Active'
            },
            {
                itemCode: 'PKG-CONE-SLV',
                name: 'Printed Cone Sleeve Wrapper',
                itemType: 'Packing Materials',
                category: 'Packaging',
                unitOfMeasure: 'Pcs',
                hsnCode: '48192090',
                gstPercent: 5,
                wholesalePrice: 0.4,
                piecesPerBox: 500,
                minimumStockLevel: 1000,
                status: 'Active'
            },
            {
                itemCode: 'PKG-BOX-24',
                name: 'Corrugated Outer Box (x24 capacity)',
                itemType: 'Packing Materials',
                category: 'Packaging',
                unitOfMeasure: 'Pcs',
                hsnCode: '48191010',
                gstPercent: 5,
                wholesalePrice: 18,
                piecesPerBox: 24,
                minimumStockLevel: 200,
                status: 'Active'
            },
            {
                itemCode: 'PKG-POUCH-POP',
                name: 'Foil Popcorn Pouch 50g',
                itemType: 'Packing Materials',
                category: 'Packaging',
                unitOfMeasure: 'Pcs',
                hsnCode: '39232990',
                gstPercent: 5,
                wholesalePrice: 1.5,
                piecesPerBox: 200,
                minimumStockLevel: 1000,
                status: 'Active'
            },
            {
                itemCode: 'PKG-BOX-COOKIE',
                name: 'Printed Cookie Box 150g',
                itemType: 'Packing Materials',
                category: 'Packaging',
                unitOfMeasure: 'Pcs',
                hsnCode: '48192020',
                gstPercent: 5,
                wholesalePrice: 5.5,
                piecesPerBox: 50,
                minimumStockLevel: 500,
                status: 'Active'
            },

            // ==========================================
            // 3. MIX (Intermediate Formula Prepared in Production)
            // ==========================================
            {
                itemCode: 'MIX-VANILLA-01',
                name: 'Vanilla Ice Cream Mix Base (1000L)',
                itemType: 'Mix',
                category: 'Mix Base',
                unitOfMeasure: 'Ltr',
                status: 'Active'
            },
            {
                itemCode: 'MIX-CHOCO-01',
                name: 'Chocolate Ice Cream Mix Base (1000L)',
                itemType: 'Mix',
                category: 'Mix Base',
                unitOfMeasure: 'Ltr',
                status: 'Active'
            },
            {
                itemCode: 'MIX-MANGO-01',
                name: 'Alphonso Mango Ice Cream Mix Base (1000L)',
                itemType: 'Mix',
                category: 'Mix Base',
                unitOfMeasure: 'Ltr',
                status: 'Active'
            },
            {
                itemCode: 'MIX-POPCORN-01',
                name: 'Butter Salt Popcorn Seasoning Batter Batch',
                itemType: 'Mix',
                category: 'Mix Base',
                unitOfMeasure: 'Kg',
                status: 'Active'
            },
            {
                itemCode: 'MIX-COOKIE-01',
                name: 'Choco Chip Cookie Dough Mix Batch',
                itemType: 'Mix',
                category: 'Mix Base',
                unitOfMeasure: 'Kg',
                status: 'Active'
            },

            // ==========================================
            // 4. FINISHED GOODS (Manufactured Products for Sale)
            // ==========================================
            {
                itemCode: 'FG-VANILLA-100',
                name: 'Vanilla Classic Cup 100ml',
                itemType: 'Finished Goods',
                category: 'Ice Cream',
                unitOfMeasure: 'Pcs',
                hsnCode: '21050000',
                gstPercent: 5,
                costPrice: 10.5,
                mrp: 20,
                wholesalePrice: 15,
                piecesPerBox: 24,
                minimumStockLevel: 200,
                status: 'Active'
            },
            {
                itemCode: 'FG-VANILLA-250',
                name: 'Vanilla Classic Tub 250ml',
                itemType: 'Finished Goods',
                category: 'Ice Cream',
                unitOfMeasure: 'Pcs',
                hsnCode: '21050000',
                gstPercent: 5,
                costPrice: 22.0,
                mrp: 45,
                wholesalePrice: 34,
                piecesPerBox: 12,
                minimumStockLevel: 100,
                status: 'Active'
            },
            {
                itemCode: 'FG-CHOCO-100',
                name: 'Double Chocolate Cup 100ml',
                itemType: 'Finished Goods',
                category: 'Ice Cream',
                unitOfMeasure: 'Pcs',
                hsnCode: '21050000',
                gstPercent: 5,
                costPrice: 13.0,
                mrp: 25,
                wholesalePrice: 18,
                piecesPerBox: 24,
                minimumStockLevel: 200,
                status: 'Active'
            },
            {
                itemCode: 'FG-MANGO-250',
                name: 'Alphonso Mango Tub 250ml',
                itemType: 'Finished Goods',
                category: 'Ice Cream',
                unitOfMeasure: 'Pcs',
                hsnCode: '21050000',
                gstPercent: 5,
                costPrice: 26.0,
                mrp: 50,
                wholesalePrice: 38,
                piecesPerBox: 12,
                minimumStockLevel: 100,
                status: 'Active'
            },
            {
                itemCode: 'FG-CHOCBAR-70',
                name: 'Choco-Bar Stick Ice Cream 70ml',
                itemType: 'Finished Goods',
                category: 'Ice Cream',
                unitOfMeasure: 'Pcs',
                hsnCode: '21050000',
                gstPercent: 5,
                costPrice: 14.5,
                mrp: 30,
                wholesalePrice: 22,
                piecesPerBox: 30,
                minimumStockLevel: 300,
                status: 'Active'
            },
            {
                itemCode: 'FG-CONE-VANILLA',
                name: 'Premium Vanilla Wafer Cone 120ml',
                itemType: 'Finished Goods',
                category: 'Ice Cream',
                unitOfMeasure: 'Pcs',
                hsnCode: '21050000',
                gstPercent: 5,
                costPrice: 19.0,
                mrp: 40,
                wholesalePrice: 30,
                piecesPerBox: 20,
                minimumStockLevel: 150,
                status: 'Active'
            },
            {
                itemCode: 'FG-POPCORN-50',
                name: 'Butter Salted Popcorn Pouch 50g',
                itemType: 'Finished Goods',
                category: 'Popcorn & Snacks',
                unitOfMeasure: 'Pcs',
                hsnCode: '19041000',
                gstPercent: 5,
                costPrice: 12.0,
                mrp: 30,
                wholesalePrice: 22,
                piecesPerBox: 40,
                minimumStockLevel: 250,
                status: 'Active'
            },
            {
                itemCode: 'FG-COOKIE-150',
                name: 'Choco Chip Cookie Box 150g',
                itemType: 'Finished Goods',
                category: 'Bakery & Cookies',
                unitOfMeasure: 'Pcs',
                hsnCode: '19053100',
                gstPercent: 5,
                costPrice: 38.0,
                mrp: 80,
                wholesalePrice: 60,
                piecesPerBox: 20,
                minimumStockLevel: 150,
                status: 'Active'
            }
        ];

        for (const item of productsList) {
            await Product.create(item);
        }
        console.log(`Successfully seeded ${productsList.length} products into DynamoDB.`);

        // 2. Seed Vendors
        console.log('Seeding vendors...');
        await Vendor.deleteMany({});
        const vendorsList = [
            {
                vendorCode: 'V-DAIRY-001',
                name: 'Krishna Dairy Farm & Co',
                contactPerson: 'Karan Singh',
                phone: '9876543210',
                email: 'orders@krishnadairy.com',
                gstinNumber: '33AAAAA1111A1Z1',
                address: {
                    street: '12, Dairy Colony Bypass Road',
                    city: 'Coimbatore',
                    state: 'Tamil Nadu',
                    stateCode: '33',
                    pinCode: '641001'
                },
                status: 'Active'
            },
            {
                vendorCode: 'V-SUGAR-002',
                name: 'Sri Ganapathy Sugar Mill Distributors',
                contactPerson: 'S. Murugan',
                phone: '9443212345',
                email: 'sales@ganapathysugar.com',
                gstinNumber: '33BBBBB2222B1Z2',
                address: {
                    street: '45, Sugar Mill Road',
                    city: 'Madurai',
                    state: 'Tamil Nadu',
                    stateCode: '33',
                    pinCode: '625001'
                },
                status: 'Active'
            },
            {
                vendorCode: 'V-PACK-003',
                name: 'Apex Packaging Industries',
                contactPerson: 'Ramesh Patel',
                phone: '9894012345',
                email: 'apexpack@gmail.com',
                gstinNumber: '33CCCCC3333C1Z3',
                address: {
                    street: 'Plot No. 18, SIDCO Industrial Estate',
                    city: 'Chennai',
                    state: 'Tamil Nadu',
                    stateCode: '33',
                    pinCode: '600098'
                },
                status: 'Active'
            }
        ];
        for (const vendor of vendorsList) {
            await Vendor.create(vendor);
        }
        console.log(`Successfully seeded ${vendorsList.length} vendors into DynamoDB.`);

        // 3. Seed Customers
        console.log('Seeding categorized customers & sales outlets...');
        await Customer.deleteMany({});
        const customersList = [
            // --- PARTY ORDERS ---
            {
                customerCode: 'C-PARTY-001',
                name: 'Sri Lakshmi Grand Caterers & Events',
                customerType: 'Party Order',
                phone: '9843012345',
                email: 'lakshmicaterers@gmail.com',
                gstinNumber: '33AAAAA1111A1Z1',
                salesOwner: 'Ramesh Kumar',
                billingAddress: {
                    street: '124, Madurai Main Road',
                    city: 'Madurai',
                    state: 'Tamil Nadu',
                    stateCode: '33',
                    pinCode: '625001'
                },
                status: 'Active'
            },
            {
                customerCode: 'C-PARTY-002',
                name: 'Royal Wedding & Banquet Services',
                customerType: 'Party Order',
                phone: '9894055667',
                email: 'events@royalbanquets.com',
                gstinNumber: '33BBBBB2222B1Z2',
                salesOwner: 'Ramesh Kumar',
                billingAddress: {
                    street: '45, Trichy Road',
                    city: 'Coimbatore',
                    state: 'Tamil Nadu',
                    stateCode: '33',
                    pinCode: '641018'
                },
                status: 'Active'
            },

            // --- DEALERS ---
            {
                customerCode: 'D-DEALER-001',
                name: 'Nila Cold Storage & Ice Cream Parlour',
                customerType: 'Dealer',
                phone: '9843055667',
                email: 'nilacoldstorage@gmail.com',
                gstinNumber: '33CCCDD4444D1Z4',
                salesOwner: 'Karthik Raja',
                billingAddress: {
                    street: '102, R.S. Puram Main Road',
                    city: 'Coimbatore',
                    state: 'Tamil Nadu',
                    stateCode: '33',
                    pinCode: '641002'
                },
                status: 'Active'
            },
            {
                customerCode: 'D-DEALER-002',
                name: 'Creamy Delights Bakery & Supermarket',
                customerType: 'Dealer',
                phone: '9789033445',
                email: 'creamydelights@gmail.com',
                gstinNumber: '33EEEEF5555E1Z5',
                salesOwner: 'Karthik Raja',
                billingAddress: {
                    street: '88, KK Nagar 8th East Street',
                    city: 'Madurai',
                    state: 'Tamil Nadu',
                    stateCode: '33',
                    pinCode: '625020'
                },
                status: 'Active'
            },

            // --- AUTO SALES (Vans / Mobile Routes) ---
            {
                customerCode: 'AUTO-01',
                name: 'Senthil Kumar (Auto 01 Driver)',
                autoId: 'AUTO-01',
                handlerName: 'Senthil Kumar',
                area: 'Coimbatore South / Town Hall Route',
                vehicleDetails: 'Piaggio Ape Auto (TN-38-AX-1234)',
                customerType: 'Auto Sales',
                phone: '9842198765',
                salesOwner: 'Murugan V',
                billingAddress: {
                    street: 'Coimbatore South / Town Hall Route',
                    city: 'Coimbatore',
                    state: 'Tamil Nadu',
                    stateCode: '33',
                    pinCode: '641001'
                },
                status: 'Active'
            },
            {
                customerCode: 'AUTO-02',
                name: 'Murugan V (Auto 02 Driver)',
                autoId: 'AUTO-02',
                handlerName: 'Murugan V',
                area: 'Madurai Junction & Bus Stand Route',
                vehicleDetails: 'E-Rickshaw Van (TN-58-BY-5678)',
                customerType: 'Auto Sales',
                phone: '9789033445',
                salesOwner: 'Murugan V',
                billingAddress: {
                    street: 'Madurai Junction & Bus Stand Route',
                    city: 'Madurai',
                    state: 'Tamil Nadu',
                    stateCode: '33',
                    pinCode: '625001'
                },
                status: 'Active'
            },
            {
                customerCode: 'AUTO-03',
                name: 'Selvam K (Auto 03 Driver)',
                autoId: 'AUTO-03',
                handlerName: 'Selvam K',
                area: 'Tirupur Hosiery Belt & Avinashi Road',
                vehicleDetails: 'Tata Ace Gold (TN-39-CZ-9012)',
                customerType: 'Auto Sales',
                phone: '9443567890',
                salesOwner: 'Murugan V',
                billingAddress: {
                    street: 'Tirupur Hosiery Belt & Avinashi Road',
                    city: 'Tirupur',
                    state: 'Tamil Nadu',
                    stateCode: '33',
                    pinCode: '641601'
                },
                status: 'Active'
            },

            // --- REGIONAL DEPOTS ---
            {
                customerCode: 'DEPOT-CBE',
                name: 'Coimbatore Main Branch Depot',
                customerType: 'Coimbatore',
                phone: '0422-2567890',
                email: 'cbe.depot@higaiicecreams.com',
                gstinNumber: '33FFFFF6666F1Z6',
                billingAddress: {
                    street: 'Plot 14, SIDCO Industrial Estate, Peelamedu',
                    city: 'Coimbatore',
                    state: 'Tamil Nadu',
                    stateCode: '33',
                    pinCode: '641004'
                },
                status: 'Active'
            },
            {
                customerCode: 'DEPOT-MDU',
                name: 'Madurai Regional Depot',
                customerType: 'Madurai',
                phone: '0452-2345678',
                email: 'mdu.depot@higaiicecreams.com',
                gstinNumber: '33GGGGG7777G1Z7',
                billingAddress: {
                    street: '22, Simmakkal Main Road',
                    city: 'Madurai',
                    state: 'Tamil Nadu',
                    stateCode: '33',
                    pinCode: '625001'
                },
                status: 'Active'
            },
            {
                customerCode: 'DEPOT-KER',
                name: 'Kerala Regional Depot (Palakkad)',
                customerType: 'Kerala',
                phone: '0491-2525252',
                email: 'kerala.depot@higaiicecreams.com',
                gstinNumber: '32HHHHH8888H1Z8',
                billingAddress: {
                    street: '10, Industrial Bypass Road',
                    city: 'Palakkad',
                    state: 'Kerala',
                    stateCode: '32',
                    pinCode: '678001'
                },
                status: 'Active'
            }
        ];
        for (const customer of customersList) {
            await Customer.create(customer);
        }
        console.log(`Successfully seeded ${customersList.length} categorized customers into DynamoDB.`);

        console.log('DynamoDB Seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding test data:', error);
        process.exit(1);
    }
};

seedData();
