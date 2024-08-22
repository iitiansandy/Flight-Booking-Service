const axios = require("axios");
const { FLIGHT_SERVICE } = require("../config/server-config");

const { BookingReposiroty } = require("../repositories");
const db = require("../models");

const { StatusCodes } = require("http-status-codes");
const { Op } = require("sequelize");

const AppError = require("../utils/errors/app-error");
const bookingRepository = new BookingReposiroty();

const { Enums } = require('../utils/common');
const { BOOKED, CANCELLED, INITIATED, PENDING } = Enums.BOOKING_STATUS;

async function createBooking(data) {
    const transaction = await db.sequelize.transaction();
    try {
        const flight = await axios.get(`${FLIGHT_SERVICE}/api/v1/flights/${data.flightId}`);
        const filghtData = flight.data.SuccessResponse.data;
        if (data.noOfSeats > filghtData.totalSeats) {
            throw new AppError('Not enough seats availbale in this flight', StatusCodes.BAD_REQUEST)
        };

        const totalBillingAmount = data.noOfSeats * filghtData.price;

        const bookingPayload = {...data, totalCost: totalBillingAmount };
        const booking = await bookingRepository.create(bookingPayload, transaction);

        await axios.patch(`${FLIGHT_SERVICE}/api/v1/flights/${data.flightId}/seats`, {
            seats: data.noOfSeats
        });

        await transaction.commit();
        return booking;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

// async function createBooking(data) {
//     console.log("data", data);
//     try {
//         const result = db.sequelize.transaction(async function bookingImpl(t) {
//             const flight = await axios.get(`${FLIGHT_SERVICE}/api/v1/flights/${data.flightId}`);
//             // const filghtData = flight.data.data;
//             console.log("flightData", flight.data);
//             // if (data.noOfSeats > filghtData.totalSeats) {
//             //     throw new AppError("Not enough seats availbale in this flight", StatusCodes.BAD_REQUEST);
//             // }
//             return true;
//         });
//     } catch (error) {
//         console.log(error);
//         throw new AppError("Not enough seats availbale in this flight", StatusCodes.INTERNAL_SERVER_ERROR);
//     }
// }

async function makePayment(data) {
    const transaction = await db.sequelize.transaction();
    try {
        const bookingDetails = await bookingRepository.get(data.bookingId, transaction);

        console.log("booking:", bookingDetails);

        if (bookingDetails.status === CANCELLED) {
            throw new AppError('This Booking is already calcelled', StatusCodes.BAD_REQUEST);
        };

        const bookingTime = new Date(bookingDetails.createdAt);
        const currentTime = new Date();

        if ((currentTime - bookingTime) > 300000) {
            await cancelBooking(data.bookingId);
            throw new AppError('This Booking has expired', StatusCodes.BAD_REQUEST);
        };

        if (bookingDetails.totalCost !== data.totalCost) {
            throw new AppError('Payment amount doesnt match', StatusCodes.BAD_REQUEST);
        };

        if (bookingDetails.userId !== data.userId) {
            throw new AppError('The user corresponding to booking doesnt match', StatusCodes.BAD_REQUEST);
        };
        // Assume that payment is successful
        await bookingRepository.update(data.bookingId, {status: BOOKED}, transaction);
        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}


async function cancelBooking(bookingId) {
    const transaction = await db.sequelize.transaction();
    try {
        const bookingDetails = await bookingRepository.get(bookingId, transaction);

        if (bookingDetails.status === CANCELLED) {
            await transaction.commit();
            return true;
        };

        await axios.patch(`${FLIGHT_SERVICE}/api/v1/flights/${bookingDetails.flightId}/seats`, {
            seats: bookingDetails.noOfSeats,
            dec: 0
        });

        await bookingRepository.update(bookingId, {status: CANCELLED}, transaction);
        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}


module.exports = {
    createBooking,
    makePayment,
    cancelBooking
};
