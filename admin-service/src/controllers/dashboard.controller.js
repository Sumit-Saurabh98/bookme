import { asyncHandler } from "../utils/asyncHandler.js";
import { getSummary as getSummaryService } from "../services/dashboard.service.js";

export const getSummary = asyncHandler(async (req, res) => {
     const summary = await getSummaryService();

     return res.status(200).json({
          success: true,
          data: summary
     });
});
