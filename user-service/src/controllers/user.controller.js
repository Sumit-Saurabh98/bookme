import { asyncHandler } from "../utils/asyncHandler.js"
import { BadRequestError } from "../utils/error.js"
import { getProfile as getProfileUserService } from "../services/user.service.js"
export const getProfile = asyncHandler(async(req, res) =>{
    const userId = req.user.id;
    if(!userId){
        throw new BadRequestError("User id is required")
    }

    const user = await getProfileUserService(userId);

    return res.status(200).json({
        success:true,
        message: "Fetched user details",
        data: {
            user
        }
    })
})