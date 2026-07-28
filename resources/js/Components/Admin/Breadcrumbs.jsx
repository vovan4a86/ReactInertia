import { Breadcrumbs as MuiBreadcrumbs, Link, Typography } from '@mui/material';
import { usePage } from '@inertiajs/react';

export default function Breadcrumbs() {
    const { url, component } = usePage();

    // Простой пример, вы можете сделать более сложную логику на основе url
    const pathnames = url.split('/').filter((x) => x);

    return (
        <MuiBreadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
            <Link underline="hover" color="inherit" href="/">
                Home
            </Link>
            {pathnames.map((value, index) => {
                const last = index === pathnames.length - 1;
                const to = `/${pathnames.slice(0, index + 1).join('/')}`;

                return last ? (
                    <Typography color="text.primary" key={to}>
                        {value.charAt(0).toUpperCase() + value.slice(1)}
                    </Typography>
                ) : (
                    <Link underline="hover" color="inherit" href={to} key={to}>
                        {value.charAt(0).toUpperCase() + value.slice(1)}
                    </Link>
                );
            })}
        </MuiBreadcrumbs>
    );
}
