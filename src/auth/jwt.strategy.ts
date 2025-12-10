import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'supersecret',
    });
  }

  async validate(payload: any) {
    // Look up the user in the database
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
});
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    // This object will be attached to req.user
    return user;
   // return { userId: payload.sub, email: payload.email };
  }
}
