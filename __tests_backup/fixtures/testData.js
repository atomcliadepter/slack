"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceTestData = exports.testErrors = exports.testFiles = exports.testWorkspace = exports.testMessages = exports.testUsers = exports.testChannels = void 0;
// Comprehensive test data fixtures
exports.testChannels = {
    public: {
        id: 'C1234567890',
        name: 'general',
        is_channel: true,
        is_group: false,
        is_im: false,
        is_mpim: false,
        is_private: false,
        created: 1234567890,
        creator: 'U1234567890',
        is_archived: false,
        is_general: true,
        unlinked: 0,
        name_normalized: 'general',
        is_shared: false,
        is_ext_shared: false,
        is_org_shared: false,
        pending_shared: [],
        is_pending_ext_shared: false,
        is_member: true,
        is_open: true,
        topic: {
            value: 'Company-wide announcements and work-based matters',
            creator: 'U1234567890',
            last_set: 1234567890
        },
        purpose: {
            value: 'This channel is for team-wide communication and announcements.',
            creator: 'U1234567890',
            last_set: 1234567890
        },
        previous_names: [],
        num_members: 150
    },
    private: {
        id: 'G1234567890',
        name: 'private-channel',
        is_channel: false,
        is_group: true,
        is_im: false,
        is_mpim: false,
        is_private: true,
        created: 1234567890,
        creator: 'U1234567890',
        is_archived: false,
        is_general: false,
        unlinked: 0,
        name_normalized: 'private-channel',
        is_shared: false,
        is_ext_shared: false,
        is_org_shared: false,
        pending_shared: [],
        is_pending_ext_shared: false,
        is_member: true,
        is_open: true,
        topic: {
            value: 'Private discussions',
            creator: 'U1234567890',
            last_set: 1234567890
        },
        purpose: {
            value: 'Private team discussions',
            creator: 'U1234567890',
            last_set: 1234567890
        },
        previous_names: [],
        num_members: 5
    }
};
exports.testUsers = {
    regular: {
        id: 'U1234567890',
        team_id: 'T1234567890',
        name: 'testuser',
        deleted: false,
        color: '9f69e7',
        real_name: 'Test User',
        tz: 'America/New_York',
        tz_label: 'Eastern Daylight Time',
        tz_offset: -14400,
        profile: {
            avatar_hash: 'ge3b51ca72de',
            status_text: 'Working from home',
            status_emoji: ':house_with_garden:',
            real_name: 'Test User',
            display_name: 'Test User',
            real_name_normalized: 'Test User',
            display_name_normalized: 'Test User',
            email: 'test@example.com',
            image_original: 'https://i.ytimg.com/vi/zEWfyv1dAyQ/hq720.jpg?sqp=-oaymwE7CK4FEIIDSFryq4qpAy0IARUAAAAAGAElAADIQj0AgKJD8AEB-AH-CYAC0AWKAgwIABABGH8gLigYMA8=&rs=AOn4CLAuV5vR6-fXhzOhCA_jjiCZnJmf7g',
            image_24: 'https://www.shutterstock.com/image-vector/filled-user-account-icon-pixel-260nw-1706820748.jpg',
            image_32: 'https://upload.wikimedia.org/wikipedia/commons/f/f4/User_Avatar_2.png',
            image_48: 'https://i.ytimg.com/vi/i2M8ErRh1BQ/hqdefault.jpg',
            image_72: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Slack_Technologies_Logo.svg/498px-Slack_Technologies_Logo.svg.png?20190329191645',
            image_192: 'https://cdn.dribbble.com/userupload/24190693/file/original-f09422d64cfb273b5c3583881f38656a.jpg',
            image_512: 'https://camo.githubusercontent.com/c77fbaaf11748827d9df62416bb949748e9c5427dce32c88d09d4d689f7e8c08/68747470733a2f2f612e736c61636b2d656467652e636f6d2f64663130642f696d672f617661746172732f6176615f303032322d3531322e706e67',
            team: 'T1234567890'
        },
        is_admin: false,
        is_owner: false,
        is_primary_owner: false,
        is_restricted: false,
        is_ultra_restricted: false,
        is_bot: false,
        updated: 1234567890,
        is_app_user: false,
        has_2fa: false
    },
    bot: {
        id: 'B1234567890',
        team_id: 'T1234567890',
        name: 'testbot',
        deleted: false,
        color: '757575',
        real_name: 'Test Bot',
        tz: null,
        tz_label: null,
        tz_offset: 0,
        profile: {
            avatar_hash: 'ge3b51ca72de',
            status_text: '',
            status_emoji: '',
            real_name: 'Test Bot',
            display_name: 'Test Bot',
            real_name_normalized: 'Test Bot',
            display_name_normalized: 'Test Bot',
            image_original: 'https://i.pinimg.com/736x/aa/23/45/aa23451a42c011be6328125633a1f6fd.jpg',
            image_24: 'https://lh7-us.googleusercontent.com/geHMasHo1j8FuaoSAOiI1NghprakhfuYmeW8v0LXmE1vY8vihn8pVjm0UkCYwLeQBKkA5BogMdh-KgK_9lmDxQBdEbPbbtxqxqd_oOOe16Pg541BJ9qz18k0YuIGDmXQAfigfC11wSuPXMMnM00fMcQ',
            image_32: 'https://i.ytimg.com/vi/OyA6rH4o80k/maxresdefault.jpg',
            image_48: 'https://lh7-us.googleusercontent.com/fNYubUFyfo0Z0QaPIlPZvzKqNjrJM1crznmZ7eDSzYfHv1yPFVrTnhqo3QrRdn78xcBL3ngl4z13dxzoUug9-OS4wNn_lmiGG9FTFPXjXllXCItGze35decV5TSzcT1VOKBK0pPQ0NoyixgYYMocFgE',
            image_72: 'https://i.ytimg.com/vi/i2M8ErRh1BQ/maxresdefault.jpg',
            image_192: 'https://a.slack-edge.com/bv1-13-br/slackbot-394d275.png',
            image_512: 'https://i.ytimg.com/vi/q5YOV9n0bWM/sddefault.jpg',
            team: 'T1234567890',
            bot_id: 'B1234567890'
        },
        is_admin: false,
        is_owner: false,
        is_primary_owner: false,
        is_restricted: false,
        is_ultra_restricted: false,
        is_bot: true,
        updated: 1234567890,
        is_app_user: false,
        has_2fa: false
    }
};
exports.testMessages = {
    simple: {
        type: 'message',
        user: 'U1234567890',
        text: 'Hello world!',
        ts: '1234567890.123456',
        team: 'T1234567890'
    },
    withAttachments: {
        type: 'message',
        user: 'U1234567890',
        text: 'Check out this file',
        ts: '1234567890.123457',
        team: 'T1234567890',
        files: [
            {
                id: 'F1234567890',
                name: 'test.txt',
                title: 'Test File',
                mimetype: 'text/plain',
                filetype: 'text',
                pretty_type: 'Plain Text',
                user: 'U1234567890',
                size: 1024,
                url_private: 'https://files.slack.com/files-pri/test.txt',
                url_private_download: 'https://files.slack.com/files-pri/test.txt?download=1'
            }
        ]
    },
    thread: {
        type: 'message',
        user: 'U1234567890',
        text: 'This is a thread reply',
        ts: '1234567890.123458',
        team: 'T1234567890',
        thread_ts: '1234567890.123456',
        parent_user_id: 'U1234567890'
    }
};
exports.testWorkspace = {
    team: {
        id: 'T1234567890',
        name: 'Test Workspace',
        domain: 'test-workspace',
        email_domain: 'example.com',
        icon: {
            image_34: 'https://i.ytimg.com/vi/gyQtfR3gp4s/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLDcX6zyHjoy9bNKS-zYciTpry9VHw',
            image_44: 'https://i.ytimg.com/vi/Vlpz2dldOsw/mqdefault.jpg',
            image_68: 'https://thumbs.dreamstime.com/b/business-people-avatars-vector-set-young-team-avatar-icons-white-background-editable-eps-file-available-66664355.jpg',
            image_88: 'https://thumbs.dreamstime.com/b/business-team-avatar-icons-flat-vector-style-business-team-avatar-icons-flat-vector-style-business-team-avatar-icons-flat-396343945.jpg',
            image_102: 'https://i.pinimg.com/736x/85/7f/31/857f3117d3c446a4c51b0238b971d451.jpg',
            image_132: 'https://i.ytimg.com/vi/Vlpz2dldOsw/maxresdefault.jpg',
            image_default: true
        },
        enterprise_id: 'E1234567890',
        enterprise_name: 'Test Enterprise'
    }
};
exports.testFiles = {
    text: {
        id: 'F1234567890',
        name: 'test.txt',
        title: 'Test File',
        mimetype: 'text/plain',
        filetype: 'text',
        pretty_type: 'Plain Text',
        user: 'U1234567890',
        size: 1024,
        url_private: 'https://files.slack.com/files-pri/test.txt',
        url_private_download: 'https://files.slack.com/files-pri/test.txt?download=1',
        created: 1234567890,
        timestamp: 1234567890,
        is_external: false,
        external_type: '',
        is_public: false,
        public_url_shared: false,
        display_as_bot: false,
        username: '',
        channels: ['C1234567890'],
        groups: [],
        ims: [],
        comments_count: 0
    },
    image: {
        id: 'F1234567891',
        name: 'test.jpg',
        title: 'Test Image',
        mimetype: 'image/jpeg',
        filetype: 'jpg',
        pretty_type: 'JPEG',
        user: 'U1234567890',
        size: 2048,
        url_private: 'https://files.slack.com/files-pri/test.jpg',
        url_private_download: 'https://i.ytimg.com/vi/zR-Iyf2d-SM/maxresdefault.jpg',
        created: 1234567890,
        timestamp: 1234567890,
        is_external: false,
        external_type: '',
        is_public: false,
        public_url_shared: false,
        display_as_bot: false,
        username: '',
        channels: ['C1234567890'],
        groups: [],
        ims: [],
        comments_count: 0,
        thumb_64: 'https://i.ytimg.com/vi/Xp9RXIQx_Ok/maxresdefault.jpg',
        thumb_80: 'https://i.ytimg.com/vi/dWQ0u8ZT_ko/maxresdefault.jpg',
        thumb_360: 'https://lh7-rt.googleusercontent.com/docsz/AD_4nXcVfv8_dNw8vVkzNYEvML707U8vNYh9VaMFCtR7D4FKUKE6xD9TWWCwuAWCETbM7Ug3wEuPrZ0G-F4S4ZryfMS3239pPzA4mp8Qs1FQ77QMV4flyD1v46ii2pWjrJesaeRqcn6Q?key=y3cvRuy0BT88Am4gzthH3uzd',
        thumb_360_w: 360,
        thumb_360_h: 240,
        thumb_480: 'https://files.slack.com/files-tmb/test-480.jpg',
        thumb_480_w: 480,
        thumb_480_h: 320
    }
};
// Error scenarios
exports.testErrors = {
    invalidAuth: {
        ok: false,
        error: 'invalid_auth',
        message: 'Invalid authentication token'
    },
    channelNotFound: {
        ok: false,
        error: 'channel_not_found',
        message: 'Channel not found'
    },
    userNotFound: {
        ok: false,
        error: 'user_not_found',
        message: 'User not found'
    },
    rateLimit: {
        ok: false,
        error: 'rate_limited',
        message: 'Rate limit exceeded'
    },
    permissionDenied: {
        ok: false,
        error: 'not_authed',
        message: 'No authentication token provided'
    }
};
// Performance test data
exports.performanceTestData = {
    largeChannelList: Array.from({ length: 1000 }, (_, i) => ({
        id: `C${String(i).padStart(9, '0')}`,
        name: `channel-${i}`,
        is_channel: true,
        is_member: i % 2 === 0,
        num_members: Math.floor(Math.random() * 100) + 1
    })),
    largeUserList: Array.from({ length: 5000 }, (_, i) => ({
        id: `U${String(i).padStart(9, '0')}`,
        name: `user${i}`,
        real_name: `User ${i}`,
        profile: {
            email: `user${i}@example.com`,
            display_name: `User ${i}`
        }
    })),
    largeMessageHistory: Array.from({ length: 100 }, (_, i) => ({
        type: 'message',
        user: `U${String(i % 10).padStart(9, '0')}`,
        text: `Message ${i}: ${Array(50).fill('word').join(' ')}`,
        ts: `${1234567890 + i}.123456`,
        team: 'T1234567890'
    }))
};
//# sourceMappingURL=testData.js.map