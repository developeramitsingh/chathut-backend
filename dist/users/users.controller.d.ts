import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getLiveFemaleUsers(): Promise<{
        id: any;
        name: string;
        phone: string;
        gender: string;
        isOnline: boolean;
    }[]>;
}
