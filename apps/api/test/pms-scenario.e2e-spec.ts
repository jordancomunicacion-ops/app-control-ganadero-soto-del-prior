import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('PMS E2E Scenario', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let hotelId: string;
    let roomTypeId: string;
    let ratePlanId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
        prisma = app.get(PrismaService);

        // CLEANUP
        await prisma.bookingRoom.deleteMany();
        await prisma.booking.deleteMany();
        await prisma.room.deleteMany();
        await prisma.ratePlan.deleteMany();
        await prisma.roomType.deleteMany();
        await prisma.hotel.deleteMany();
    });

    afterAll(async () => {
        await app.close();
    });

    it('1. Create Hotel & Inventory', async () => {
        // A. Create Hotel
        const hotelRes = await request(app.getHttpServer())
            .post('/property/hotels')
            .send({ name: 'Grand Hotel Test', currency: 'EUR', timezone: 'Europe/Madrid' })
            .expect(201)
            .catch(err => {
                console.error("Create Hotel Failed:", err.response?.body || err);
                throw err;
            });
        hotelId = hotelRes.body.id;

        // B. Create RoomType
        const rtRes = await request(app.getHttpServer())
            .post(`/property/hotels/${hotelId}/room-types`)
            .send({ name: 'Double Room', basePrice: 100, capacity: 2 })
            .expect(201);
        roomTypeId = rtRes.body.id;

        // C. Create Rooms (101, 102)
        await request(app.getHttpServer()).post(`/property/room-types/${roomTypeId}/rooms`)
            .send({ name: '101' }).expect(201);
        await request(app.getHttpServer()).post(`/property/room-types/${roomTypeId}/rooms`)
            .send({ name: '102' }).expect(201);

        // D. Create RatePlan
        const rpRes = await request(app.getHttpServer())
            .post('/rates/plans')
            .send({ hotelId, name: 'Standard Rate', isDefault: true })
            .expect(201);
        ratePlanId = rpRes.body.id;
    });

    it('2. Check Availability (Should be 2)', async () => {
        const res = await request(app.getHttpServer())
            .get('/booking/availability')
            .query({ hotelId, from: '2025-06-01', to: '2025-06-05', pax: 2 })
            .expect(200);

        expect(res.body).toHaveLength(1);
        expect(res.body[0].name).toBe('Double Room');
        // We don't expose exact count in public API usually, but if we did...
        // Here we just verify it exists.
    });

    it('3. Create Booking (Reduce Inventory)', async () => {
        const res = await request(app.getHttpServer())
            .post('/booking')
            .send({
                hotelId,
                guestName: 'John Doe',
                checkInDate: '2025-06-01',
                checkOutDate: '2025-06-05',
                roomTypeId: roomTypeId,
                pax: 2
            })
            .expect(201);

        expect(res.body.status).toBe('CONFIRMED');
        expect(res.body.referenceCode).toBeDefined();
    });

    it('4. Verify Calendar (Booking Exists)', async () => {
        const res = await request(app.getHttpServer())
            .get(`/bookings/${hotelId}`)
            .expect(200);

        expect(res.body.length).toBeGreaterThan(0);
        expect(res.body[0].guestName).toBe('John Doe');
    });

    it('5. Restriction Test (Stop Sell)', async () => {
        // Apply Stop Sell for 2025-07-01
        // Need to create Restriction manually via Prisma since we didn't expose full API yet for that
        await prisma.restriction.create({
            data: {
                hotelId,
                roomTypeId,
                date: new Date('2025-07-01'),
                stopSell: true
            }
        });

        // Try Booking
        await request(app.getHttpServer())
            .post('/booking')
            .send({
                hotelId,
                guestName: 'Jane Blocked',
                checkInDate: '2025-07-01',
                checkOutDate: '2025-07-03',
                roomTypeId: roomTypeId,
                pax: 2
            })
            .expect(400); // Bad Request expected
    });
});
