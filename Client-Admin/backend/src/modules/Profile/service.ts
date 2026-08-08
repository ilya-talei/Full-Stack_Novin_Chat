import type Session from "../../database/models/session.js";

class ProfileService {
    async logout(session: Session) {
        session.expire_at = new Date();
        await session.save();
    }
}

export default ProfileService;
