import type Session from "../../database/models/session.js";

class ProfileService {
    static async logout(session: Session) {
        session.expire_at = new Date();
        await session.save();
    }
}

export default ProfileService;
