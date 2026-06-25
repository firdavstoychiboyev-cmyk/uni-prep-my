/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        missingSuspenseWithCSRBailout: false,
    },
    images: {
        remotePatterns: [
            { protocol: "https", hostname: "i.ibb.co" },
            { protocol: "https", hostname: "jidu.uz" },
            { protocol: "https", hostname: "tdyu.uz" },
            { protocol: "https", hostname: "tdiu.uz" },
            { protocol: "https", hostname: "nuu.uz" },
            { protocol: "https", hostname: "tuit.uz" },
        ],
    },
};

export default nextConfig;
