import bcrypt from 'bcryptjs';
import { getUserModel } from '../models/User.model.js';
import {
    issueAccessToken,
    issueRefreshToken,
} from '../middleware/auth.middleware.js';
import { ConflictError, UnauthorizedError, NotFoundError } from '../utils/errors.js';
import type { RegisterRequest, LoginRequest, User } from '../../shared/types.js';

const stripPasswordHash = (user: any): Omit<User, 'passwordHash'> => {
    const json = user.toJSON ? user.toJSON() : { ...user };
    delete json.password_hash;
    delete json.passwordHash;
    return json;
};

export const register = async (payload: RegisterRequest) => {
    const existing = await getUserModel().findOne({
        where: { email: payload.email },
    });

    if (existing) {
        throw new ConflictError('User with this email already exists');
    }

    const passwordHash = bcrypt.hashSync(payload.password, 10);

    const user = await getUserModel().create({
        email: payload.email,
        name: payload.name,
        passwordHash,
    } as any);

    const safeUser = stripPasswordHash(user);
    const accessToken = issueAccessToken({ id: safeUser.id, email: safeUser.email });
    const refreshToken = issueRefreshToken({ id: safeUser.id });

    return {
        user: safeUser,
        accessToken,
        refreshToken,
    };
};

export const login = async (payload: LoginRequest) => {
    const user = await getUserModel().findOne({
        where: { email: payload.email },
    });

    if (!user) {
        throw new UnauthorizedError('Invalid email or password');
    }

    const userData = user as any;
    const hash = userData.passwordHash || userData.password_hash;
    const isMatch = bcrypt.compareSync(payload.password, hash);

    if (!isMatch) {
        throw new UnauthorizedError('Invalid email or password');
    }

    const safeUser = stripPasswordHash(user);
    const accessToken = issueAccessToken({ id: safeUser.id, email: safeUser.email });
    const refreshToken = issueRefreshToken({ id: safeUser.id });

    return {
        user: safeUser,
        accessToken,
        refreshToken,
    };
};

export const getProfile = async (userId: number) => {
    const user = await getUserModel().findByPk(userId, {
        attributes: { exclude: ['passwordHash', 'password_hash'] },
    });

    if (!user) {
        throw new NotFoundError('User not found');
    }

    return stripPasswordHash(user);
};

export default {
    register,
    login,
    getProfile,
};
