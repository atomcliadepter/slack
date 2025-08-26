export declare const testChannels: {
    public: {
        id: string;
        name: string;
        is_channel: boolean;
        is_group: boolean;
        is_im: boolean;
        is_mpim: boolean;
        is_private: boolean;
        created: number;
        creator: string;
        is_archived: boolean;
        is_general: boolean;
        unlinked: number;
        name_normalized: string;
        is_shared: boolean;
        is_ext_shared: boolean;
        is_org_shared: boolean;
        pending_shared: never[];
        is_pending_ext_shared: boolean;
        is_member: boolean;
        is_open: boolean;
        topic: {
            value: string;
            creator: string;
            last_set: number;
        };
        purpose: {
            value: string;
            creator: string;
            last_set: number;
        };
        previous_names: never[];
        num_members: number;
    };
    private: {
        id: string;
        name: string;
        is_channel: boolean;
        is_group: boolean;
        is_im: boolean;
        is_mpim: boolean;
        is_private: boolean;
        created: number;
        creator: string;
        is_archived: boolean;
        is_general: boolean;
        unlinked: number;
        name_normalized: string;
        is_shared: boolean;
        is_ext_shared: boolean;
        is_org_shared: boolean;
        pending_shared: never[];
        is_pending_ext_shared: boolean;
        is_member: boolean;
        is_open: boolean;
        topic: {
            value: string;
            creator: string;
            last_set: number;
        };
        purpose: {
            value: string;
            creator: string;
            last_set: number;
        };
        previous_names: never[];
        num_members: number;
    };
};
export declare const testUsers: {
    regular: {
        id: string;
        team_id: string;
        name: string;
        deleted: boolean;
        color: string;
        real_name: string;
        tz: string;
        tz_label: string;
        tz_offset: number;
        profile: {
            avatar_hash: string;
            status_text: string;
            status_emoji: string;
            real_name: string;
            display_name: string;
            real_name_normalized: string;
            display_name_normalized: string;
            email: string;
            image_original: string;
            image_24: string;
            image_32: string;
            image_48: string;
            image_72: string;
            image_192: string;
            image_512: string;
            team: string;
        };
        is_admin: boolean;
        is_owner: boolean;
        is_primary_owner: boolean;
        is_restricted: boolean;
        is_ultra_restricted: boolean;
        is_bot: boolean;
        updated: number;
        is_app_user: boolean;
        has_2fa: boolean;
    };
    bot: {
        id: string;
        team_id: string;
        name: string;
        deleted: boolean;
        color: string;
        real_name: string;
        tz: null;
        tz_label: null;
        tz_offset: number;
        profile: {
            avatar_hash: string;
            status_text: string;
            status_emoji: string;
            real_name: string;
            display_name: string;
            real_name_normalized: string;
            display_name_normalized: string;
            image_original: string;
            image_24: string;
            image_32: string;
            image_48: string;
            image_72: string;
            image_192: string;
            image_512: string;
            team: string;
            bot_id: string;
        };
        is_admin: boolean;
        is_owner: boolean;
        is_primary_owner: boolean;
        is_restricted: boolean;
        is_ultra_restricted: boolean;
        is_bot: boolean;
        updated: number;
        is_app_user: boolean;
        has_2fa: boolean;
    };
};
export declare const testMessages: {
    simple: {
        type: string;
        user: string;
        text: string;
        ts: string;
        team: string;
    };
    withAttachments: {
        type: string;
        user: string;
        text: string;
        ts: string;
        team: string;
        files: {
            id: string;
            name: string;
            title: string;
            mimetype: string;
            filetype: string;
            pretty_type: string;
            user: string;
            size: number;
            url_private: string;
            url_private_download: string;
        }[];
    };
    thread: {
        type: string;
        user: string;
        text: string;
        ts: string;
        team: string;
        thread_ts: string;
        parent_user_id: string;
    };
};
export declare const testWorkspace: {
    team: {
        id: string;
        name: string;
        domain: string;
        email_domain: string;
        icon: {
            image_34: string;
            image_44: string;
            image_68: string;
            image_88: string;
            image_102: string;
            image_132: string;
            image_default: boolean;
        };
        enterprise_id: string;
        enterprise_name: string;
    };
};
export declare const testFiles: {
    text: {
        id: string;
        name: string;
        title: string;
        mimetype: string;
        filetype: string;
        pretty_type: string;
        user: string;
        size: number;
        url_private: string;
        url_private_download: string;
        created: number;
        timestamp: number;
        is_external: boolean;
        external_type: string;
        is_public: boolean;
        public_url_shared: boolean;
        display_as_bot: boolean;
        username: string;
        channels: string[];
        groups: never[];
        ims: never[];
        comments_count: number;
    };
    image: {
        id: string;
        name: string;
        title: string;
        mimetype: string;
        filetype: string;
        pretty_type: string;
        user: string;
        size: number;
        url_private: string;
        url_private_download: string;
        created: number;
        timestamp: number;
        is_external: boolean;
        external_type: string;
        is_public: boolean;
        public_url_shared: boolean;
        display_as_bot: boolean;
        username: string;
        channels: string[];
        groups: never[];
        ims: never[];
        comments_count: number;
        thumb_64: string;
        thumb_80: string;
        thumb_360: string;
        thumb_360_w: number;
        thumb_360_h: number;
        thumb_480: string;
        thumb_480_w: number;
        thumb_480_h: number;
    };
};
export declare const testErrors: {
    invalidAuth: {
        ok: boolean;
        error: string;
        message: string;
    };
    channelNotFound: {
        ok: boolean;
        error: string;
        message: string;
    };
    userNotFound: {
        ok: boolean;
        error: string;
        message: string;
    };
    rateLimit: {
        ok: boolean;
        error: string;
        message: string;
    };
    permissionDenied: {
        ok: boolean;
        error: string;
        message: string;
    };
};
export declare const performanceTestData: {
    largeChannelList: {
        id: string;
        name: string;
        is_channel: boolean;
        is_member: boolean;
        num_members: number;
    }[];
    largeUserList: {
        id: string;
        name: string;
        real_name: string;
        profile: {
            email: string;
            display_name: string;
        };
    }[];
    largeMessageHistory: {
        type: string;
        user: string;
        text: string;
        ts: string;
        team: string;
    }[];
};
//# sourceMappingURL=testData.d.ts.map