const axios = require("axios");
const { FLIGHT_SERVICE } = require("../config/server-config");

const { BookingReposiroty } = require("../repositories");
const db = require("../models");

const { StatusCodes } = require("http-status-codes");
const { Op } = require("sequelize");

const AppError = require("../utils/errors/app-error");
const bookingRepository = new BookingReposiroty();

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

module.exports = {
    createBooking,
};
