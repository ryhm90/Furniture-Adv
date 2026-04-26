"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import PropTypes from "prop-types";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

import logoM from "../../../public/logo.png";

const LayoutDrawerContent = dynamic(() => import("./LayoutDrawerContent"), {
  ssr: false,
});

const drawerWidth = 292;

function AppShell({ children, A, sx, primaryTypographyProps }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [pageTitle, setPageTitle] = React.useState(A);
  const [openfinancial, setOpenfinancial] = React.useState(false);
  const [openReports, setOpenReports] = React.useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();

  React.useEffect(() => {
    setPageTitle(A);
  }, [A]);

  React.useEffect(() => {
    setOpenfinancial(pathname?.startsWith("/financial") ?? false);
    setOpenReports(pathname?.startsWith("/reports") ?? false);
    setMobileOpen(false);
  }, [pathname]);

  const handleDrawerToggle = () => {
    setMobileOpen((previous) => !previous);
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  const handleNavigation = (path, title) => {
    router.push(path);
    setPageTitle(title);
    setMobileOpen(false);
  };

  const companyLabel =
    session?.user?.pageName || session?.user?.database || "الفرع غير محدد";
  const todayLabel = React.useMemo(
    () =>
      new Intl.DateTimeFormat("ar-IQ", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date()),
    [],
  );

  const drawer = (
    <LayoutDrawerContent
      session={session}
      pathname={pathname}
      openfinancial={openfinancial}
      openReports={openReports}
      onToggleFinancial={() => setOpenfinancial((previous) => !previous)}
      onToggleReports={() => setOpenReports((previous) => !previous)}
      onNavigate={handleNavigation}
      onSignOut={handleSignOut}
    />
  );

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "#f3f7f7",
      }}
    >
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: "rgba(250, 252, 252, 0.92)",
          backdropFilter: "blur(14px)",
          color: "#123232",
          borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
          boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
          width: {
            xs: "100%",
            md: `calc(100% - ${drawerWidth}px)`,
          },
          mr: {
            xs: 0,
            md: `${drawerWidth}px`,
          },
        }}
      >
        <Toolbar
          sx={{
            minHeight: { xs: 72, md: 78 },
            px: { xs: 1.5, sm: 2, md: 3 },
          }}
        >
          <Box
            sx={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
              <IconButton
                edge="start"
                color="inherit"
                aria-label="open drawer"
                onClick={handleDrawerToggle}
                sx={{
                  display: { md: "none" },
                  width: 44,
                  height: 44,
                  borderRadius: 2.5,
                  border: "1px solid rgba(15, 23, 42, 0.08)",
                  backgroundColor: "#ffffff",
                  flexShrink: 0,
                }}
              >
                <MenuRoundedIcon />
              </IconButton>

              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="h6"
                  noWrap
                  component="div"
                  sx={{
                    fontFamily: "Alexandria, sans-serif",
                    fontSize: { xs: "16px", md: "20px" },
                    fontWeight: 600,
                    lineHeight: 1.3,
                    textAlign: "right",
                    ...primaryTypographyProps,
                  }}
                >
                  {pageTitle}
                </Typography>
                <Typography
                  noWrap
                  sx={{
                    mt: 0.35,
                    fontFamily: "Alexandria, sans-serif",
                    fontSize: "12px",
                    color: "rgba(18, 50, 50, 0.70)",
                    textAlign: "right",
                  }}
                >
                  {companyLabel}
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexShrink: 0 }}>
              <Box sx={{ display: { xs: "none", xl: "block" } }}>
                <Typography
                  sx={{
                    fontFamily: "Alexandria, sans-serif",
                    fontSize: "12px",
                    color: "rgba(18, 50, 50, 0.72)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {todayLabel}
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Image
                  src={logoM}
                  alt="شعار النظام"
                  width={152}
                  height={52}
                  priority
                  style={{ width: "auto", height: "36px", maxWidth: "100%" }}
                />
              </Box>
            </Stack>
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        {mobileOpen ? (
          <Box
            aria-label="قائمة التنقل"
            sx={{
              display: { xs: "block", md: "none" },
              position: "fixed",
              inset: 0,
              zIndex: (theme) => theme.zIndex.drawer + 2,
            }}
          >
            <Box
              onClick={handleDrawerToggle}
              sx={{
                position: "absolute",
                inset: 0,
                bgcolor: "rgba(15, 23, 42, 0.42)",
                backdropFilter: "blur(4px)",
              }}
            />

            <Box
              sx={{
                position: "absolute",
                top: 0,
                right: 0,
                width: { xs: "88vw", sm: drawerWidth },
                maxWidth: drawerWidth,
                height: "100%",
                background:
                  "linear-gradient(180deg, rgba(250,252,252,1) 0%, rgba(244,248,248,1) 100%)",
                borderLeft: "1px solid rgba(15, 23, 42, 0.08)",
                boxShadow: "0 22px 40px rgba(15, 23, 42, 0.20)",
                overflow: "hidden",
              }}
            >
              {drawer}
            </Box>
          </Box>
        ) : null}

        <Box
          sx={{
            display: { xs: "none", md: "block" },
            position: "fixed",
            top: 0,
            right: 0,
            width: drawerWidth,
            height: "100vh",
            background:
              "linear-gradient(180deg, rgba(250,252,252,1) 0%, rgba(244,248,248,1) 100%)",
            borderLeft: "1px solid rgba(15, 23, 42, 0.08)",
            overflow: "hidden",
            zIndex: (theme) => theme.zIndex.drawer,
          }}
        >
          {drawer}
        </Box>
      </Box>

      <Box
        component="main"
        dir="rtl"
        sx={[
          {
            flexGrow: 1,
            minHeight: "100vh",
            px: { xs: 1.5, sm: 2, md: 3 },
            py: { xs: 2, md: 3 },
            width: {
              xs: "100%",
              md: `calc(100% - ${drawerWidth}px)`,
            },
            backgroundColor: "#f3f7f7",
            textAlign: "right",
            overflowX: "hidden",
          },
          sx,
        ]}
      >
        <Toolbar sx={{ minHeight: { xs: 72, md: 78 } }} />
        <Box sx={{ width: "100%" }}>{children}</Box>
      </Box>
    </Box>
  );
}

AppShell.propTypes = {
  children: PropTypes.node,
  A: PropTypes.string,
  sx: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  primaryTypographyProps: PropTypes.object,
};

export default AppShell;
