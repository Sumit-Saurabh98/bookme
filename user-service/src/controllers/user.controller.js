import { asyncHandler } from "../utils/asyncHandler.js"
import { BadRequestError } from "../utils/error.js"
import { getProfile as getProfileUserService, updateProfile as updateProfileService, deleteProfile as deleteProfileService } from "../services/user.service.js"
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

export const updateProfile = asyncHandler(async(req, res)=>{
    const userId = req.user.id;
    if(!userId){
        throw new BadRequestError("User id is required")
    }

    const user = await updateProfileService(userId, req.body);

    return res.status(200).json({
        success:true,
        message: "Profile updated successfully",
        data: {
            user
        }
    })
})

export const deleteProfile = asyncHandler(async(req, res)=>{
    const userId = req.user.id;
    if(!userId){
        throw new BadRequestError("User id is required")
    }

    await deleteProfileService(userId);

    return res
        .clearCookie("accessToken", {
            httpOnly: true,
            secure: true,
            sameSite: "strict"
        })
        .clearCookie("refreshToken", {
            httpOnly: true,
            secure: true,
            sameSite: "strict"
        })
        .status(200)
        .json({
            success:true,
            message: "Profile deleted successfully"
        })
})
