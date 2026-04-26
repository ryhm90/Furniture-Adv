"use client";

import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import CircleRoundedIcon from "@mui/icons-material/CircleRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import PointOfSaleRoundedIcon from "@mui/icons-material/PointOfSaleRounded";
import QueryStatsRoundedIcon from "@mui/icons-material/QueryStatsRounded";
import ScienceRoundedIcon from "@mui/icons-material/ScienceRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import Image from "next/image";

import logo from "./logo.png";

const ROLE_LABELS = {
  Manager: "المدير",
  Accountant: "المحاسب",
  Sellor: "المبيعات",
  Affiliate: "الوكيل",
  Provider: "التجهيز",
  SECRETARY: "السكرتارية",
};

const listTextProps = {
  sx: { direction: "rtl", textAlign: "right", my: 0 },
  primaryTypographyProps: {
    fontFamily: "Alexandria, sans-serif",
    fontSize: "13px",
    fontWeight: 500,
    noWrap: true,
  },
};

function getUserInitials(name) {
  const segments = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (segments.length === 0) {
    return "؟";
  }

  return segments.map((segment) => segment.charAt(0)).join("").toUpperCase();
}

function SectionLabel({ children }) {
  return (
    <Typography
      sx={{
        px: 1.5,
        pt: 1.5,
        pb: 0.75,
        fontFamily: "Alexandria, sans-serif",
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.04em",
        color: "rgba(18, 50, 50, 0.55)",
      }}
    >
      {children}
    </Typography>
  );
}

function DrawerItem({ active, icon, label, onClick, children, depth = 0 }) {
  return (
    <ListItem disablePadding sx={{ mb: 0.5 }}>
      <ListItemButton
        onClick={onClick}
        sx={{
          minHeight: depth === 0 ? 46 : 40,
          px: 1.25,
          pr: depth === 0 ? 1.5 : 2.5,
          pl: depth === 0 ? 1.25 : 1.75,
          borderRadius: 3,
          color: active ? "#103b58" : "#223a45",
          backgroundColor: active ? "rgba(37, 99, 235, 0.10)" : "transparent",
          border: active ? "1px solid rgba(37, 99, 235, 0.12)" : "1px solid transparent",
          "&:hover": {
            backgroundColor: active ? "rgba(37, 99, 235, 0.12)" : "rgba(15, 23, 42, 0.04)",
          },
        }}
      >
        {icon ? (
          <ListItemIcon
            sx={{
              minWidth: 38,
              color: "inherit",
              justifyContent: "center",
            }}
          >
            {icon}
          </ListItemIcon>
        ) : null}
        <ListItemText
          primary={label}
          sx={listTextProps.sx}
          primaryTypographyProps={{
            ...listTextProps.primaryTypographyProps,
            fontSize: depth === 0 ? "13px" : "12.5px",
            fontWeight: active ? 700 : depth === 0 ? 500 : 400,
          }}
        />
        {children}
      </ListItemButton>
    </ListItem>
  );
}

function NestedItem({ active, label, onClick }) {
  return (
    <DrawerItem
      active={active}
      label={label}
      onClick={onClick}
      depth={1}
      icon={<CircleRoundedIcon sx={{ fontSize: 8 }} />}
    />
  );
}

export default function LayoutDrawerContent({
  session,
  pathname,
  openfinancial,
  openReports,
  onToggleFinancial,
  onToggleReports,
  onNavigate,
  onSignOut,
}) {
  const role = session?.user?.role;
  const roleLabel = ROLE_LABELS[role] || role || "مستخدم النظام";
  const branchLabel = session?.user?.pageName || session?.user?.database || "الفرع غير محدد";
  const userInitials = getUserInitials(session?.user?.name);

  const isSellor = role === "Sellor";
  const isAffiliate = role === "Affiliate";
  const isAccountant = role === "Accountant";
  const isManager = role === "Manager";

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "transparent",
        direction: "rtl",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          px: 2,
          pt: 1.75,
          pb: 1.5,
          position: "sticky",
          top: 0,
          zIndex: 2,
          borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(247,250,250,0.92) 100%)",
        }}
      >
        <Stack direction="row" spacing={1.2} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1.1} alignItems="center">
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: 3,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "linear-gradient(135deg, rgba(56,110,110,0.14) 0%, rgba(37,99,235,0.08) 100%)",
                border: "1px solid rgba(56, 110, 110, 0.14)",
              }}
            >
              <Image src={logo} height={28} width={28} alt="شعار النظام" />
            </Box>
            <Box>
              <Typography
                sx={{
                  fontFamily: "Alexandria, sans-serif",
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "#123232",
                }}
              >
                نظام ادارة مبيعات الأثاث
              </Typography>
            </Box>
          </Stack>
        </Stack>

        <Box
          sx={{
            mt: 1.75,
            p: 1.5,
          }}
        >
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Avatar
              sx={{
                width: 42,
                height: 42,
                backgroundColor: "#386e6e",
                fontFamily: "Alexandria, sans-serif",
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              {userInitials}
            </Avatar>
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Typography
                noWrap
                sx={{
                  fontFamily: "Alexandria, sans-serif",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#102f2f",
                }}
              >
                {session?.user?.name || "مستخدم النظام"}
              </Typography>
              <Typography
                noWrap
                sx={{
                  mt: 0.25,
                  fontFamily: "Alexandria, sans-serif",
                  fontSize: "11px",
                  color: "rgba(18, 50, 50, 0.66)",
                }}
              >
                {session?.user?.email || "بدون بريد"}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} mt={1.25} useFlexGap flexWrap="wrap">
            <Chip
              label={roleLabel}
              size="small"
              variant="outlined"
              sx={{
                fontFamily: "Alexandria, sans-serif",
                borderRadius: "999px",
                backgroundColor: "rgba(56, 110, 110, 0.06)",
              }}
            />
            <Chip
              label={branchLabel}
              size="small"
              variant="outlined"
              sx={{
                fontFamily: "Alexandria, sans-serif",
                borderRadius: "999px",
                maxWidth: "100%",
                "& .MuiChip-label": {
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                },
              }}
            />
          </Stack>
        </Box>
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          px: 1.25,
          py: 1.5,
        }}
      >
        <List disablePadding>
          {(isSellor || isAffiliate || isAccountant || isManager) && (
            <>

              <DrawerItem
                active={pathname.startsWith("/dashboard")}
                icon={<DashboardRoundedIcon />}
                label="لوحة التحكم"
                onClick={() => onNavigate("/dashboard", "لوحة التحكم")}
              />
            </>
          )}

          {isSellor ? (
            <>
              <DrawerItem
                active={pathname.startsWith("/sales")}
                icon={<PointOfSaleRoundedIcon />}
                label="المبيعات"
                onClick={() => onNavigate("/sales", "المبيعات")}
              />
            </>
          ) : null}

          {isAffiliate ? (
            <>
              <SectionLabel>العمل اليومي</SectionLabel>
              <DrawerItem
                active={pathname.startsWith("/appointments")}
                icon={<StorefrontRoundedIcon />}
                label="المواعيد"
                onClick={() => onNavigate("/appointments", "المواعيد")}
              />
              <DrawerItem
                active={pathname.startsWith("/patients")}
                icon={<ManageAccountsRoundedIcon />}
                label="المرضى"
                onClick={() => onNavigate("/patients", "المرضى")}
              />
              <DrawerItem
                active={pathname.startsWith("/lab")}
                icon={<ScienceRoundedIcon />}
                label="المختبر"
                onClick={() => onNavigate("/lab", "المختبر")}
              />

              <SectionLabel>الإدارة المالية</SectionLabel>
              <DrawerItem
                active={pathname.startsWith("/financial")}
                icon={<PaymentsRoundedIcon />}
                label="القوائم المالية"
                onClick={onToggleFinancial}
              >
                {openfinancial ? <ExpandLess /> : <ExpandMore />}
              </DrawerItem>
              <Collapse in={openfinancial} timeout="auto" unmountOnExit>
                <List component="div" disablePadding sx={{ mt: 0.25 }}>
                  <NestedItem
                    active={pathname.startsWith("/financial/patients")}
                    label="المرضى"
                    onClick={() => onNavigate("/financial/patients", "المرضى")}
                  />
                  <NestedItem
                    active={pathname.startsWith("/financial/labs")}
                    label="المختبرات"
                    onClick={() => onNavigate("/financial/labs", "المختبرات")}
                  />
                  <NestedItem
                    active={pathname.startsWith("/financial/providers")}
                    label="المجهزون"
                    onClick={() => onNavigate("/financial/providers", "المجهزون")}
                  />
                  <NestedItem
                    active={pathname.startsWith("/financial/income")}
                    label="الدخل"
                    onClick={() => onNavigate("/financial/income", "الدخل")}
                  />
                  <NestedItem
                    active={pathname.startsWith("/financial/payroll")}
                    label="الرواتب"
                    onClick={() => onNavigate("/financial/payroll", "الرواتب")}
                  />
                  <NestedItem
                    active={pathname.startsWith("/financial/reports")}
                    label="التقارير"
                    onClick={() => onNavigate("/financial/reports", "التقارير")}
                  />
                </List>
              </Collapse>
            </>
          ) : null}

          {isManager ? (
            <>
              <DrawerItem
                active={pathname.startsWith("/inventory")}
                icon={<Inventory2RoundedIcon />}
                label="إدارة المخازن"
                onClick={() => onNavigate("/inventory", "إدارة المخازن")}
              />
              <DrawerItem
                active={pathname.startsWith("/sales")}
                icon={<PointOfSaleRoundedIcon />}
                label="المبيعات"
                onClick={() => onNavigate("/sales", "المبيعات")}
              />
              <DrawerItem
                active={pathname.startsWith("/providers")}
                icon={<ApartmentRoundedIcon />}
                label="المشتريات المستوردة"
                onClick={() => onNavigate("/providers", "إدارة المشتريات المستوردة")}
              />
              <DrawerItem
                active={pathname.startsWith("/delivery")}
                icon={<LocalShippingRoundedIcon />}
                label="التجهيز"
                onClick={() => onNavigate("/delivery", "التجهيز")}
              />
              <DrawerItem
                active={pathname.startsWith("/wholesale")}
                icon={<StorefrontRoundedIcon />}
                label="مبيعات الجملة"
                onClick={() => onNavigate("/wholesale", "إدارة مبيعات الجملة")}
              />

              <DrawerItem
                active={pathname.startsWith("/financial")}
                icon={<PaymentsRoundedIcon />}
                label="الإدارة المالية"
                onClick={onToggleFinancial}
              >
                {openfinancial ? <ExpandLess /> : <ExpandMore />}
              </DrawerItem>
              <Collapse in={openfinancial} timeout="auto" unmountOnExit>
                <List component="div" disablePadding sx={{ mt: 0.25 }}>
                  <NestedItem
                    active={pathname.startsWith("/financial/rent")}
                    label="الإيجار"
                    onClick={() => onNavigate("/financial/rent", "الإيجار")}
                  />
                  <NestedItem
                    active={pathname.startsWith("/financial/financials_management")}
                    label="إدارة المحافظ المالية"
                    onClick={() =>
                      onNavigate(
                        "/financial/financials_management",
                        "إدارة المحافظ المالية",
                      )
                    }
                  />
                  <NestedItem
                    active={pathname.startsWith("/financial/providers")}
                    label="المجهزون"
                    onClick={() => onNavigate("/financial/providers", "المجهزون")}
                  />
                  <NestedItem
                    active={pathname.startsWith("/financial/income")}
                    label="الدخل والمصروفات"
                    onClick={() => onNavigate("/financial/income", "الدخل والمصروفات")}
                  />
                  <NestedItem
                    active={pathname.startsWith("/financial/employees")}
                    label="إدارة الموظفين"
                    onClick={() => onNavigate("/financial/employees", "إدارة الموظفين")}
                  />
                </List>
              </Collapse>

              <DrawerItem
                active={pathname.startsWith("/reports")}
                icon={<QueryStatsRoundedIcon />}
                label="التقارير والإحصائيات"
                onClick={onToggleReports}
              >
                {openReports ? <ExpandLess /> : <ExpandMore />}
              </DrawerItem>
              <Collapse in={openReports} timeout="auto" unmountOnExit>
                <List component="div" disablePadding sx={{ mt: 0.25 }}>
                  <NestedItem
                    active={pathname.startsWith("/reports/tables")}
                    label="الجداول"
                    onClick={() => onNavigate("/reports/tables", "الجداول")}
                  />
                  <NestedItem
                    active={pathname.startsWith("/reports/charts")}
                    label="الإحصائيات"
                    onClick={() => onNavigate("/reports/charts", "الإحصائيات")}
                  />
                </List>
              </Collapse>
            </>
          ) : null}
        </List>
      </Box>

      <Box
        sx={{
          px: 1.5,
          py: 1.25,
          borderTop: "1px solid rgba(15, 23, 42, 0.08)",
          backgroundColor: "rgba(255, 255, 255, 0.68)",
        }}
      >
        <Button
          fullWidth
          variant="outlined"
          color="inherit"
          startIcon={<LogoutRoundedIcon />}
          onClick={onSignOut}
          sx={{
            minHeight: 44,
            borderRadius: 3,
            justifyContent: "center",
            gap: 1,
            fontFamily: "Alexandria, sans-serif",
            fontSize: "13px",
            color: "#7f1d1d",
            borderColor: "rgba(127, 29, 29, 0.18)",
            backgroundColor: "rgba(255, 255, 255, 0.82)",
            "&:hover": {
              borderColor: "rgba(127, 29, 29, 0.28)",
              backgroundColor: "rgba(127, 29, 29, 0.05)",
            },
          }}
        >
          تسجيل الخروج
        </Button>
      </Box>
    </Box>
  );
}
