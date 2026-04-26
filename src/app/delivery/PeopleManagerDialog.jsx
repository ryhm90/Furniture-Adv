"use client";

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import useSubmissionState from "@/app/components/useSubmissionState";

const titleSx = {
  fontFamily: "Alexandria, sans-serif",
  direction: "rtl",
};

const textFieldSx = {
  marginTop: "10px",
  "& input": {
    fontFamily: "Alexandria, sans-serif",
    direction: "rtl",
  },
  "& label": {
    fontFamily: "Alexandria, sans-serif",
    direction: "rtl",
  },
};

const buttonSx = {
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "13px",
  direction: "rtl",
};

export default function PeopleManagerDialog({
  open,
  title,
  itemLabel,
  addLabel,
  items,
  onItemChange,
  onDeleteItem,
  onAddItem,
  onClose,
  onSave,
}) {
  const [isSubmitting, runWithSubmission] = useSubmissionState();

  const handleSave = async () => {
    await runWithSubmission(async () => {
      await onSave();
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle sx={titleSx}>{title}</DialogTitle>

      <DialogContent>
        {items.map((item, index) => (
          <Box
            key={item.ID ?? `${itemLabel}-${index}`}
            className="flex gap-2 items-center mb-2"
          >
            <TextField
              fullWidth
              label={`${itemLabel} ${index + 1}`}
              value={item.Name}
              onChange={(event) => onItemChange(index, event.target.value)}
              sx={textFieldSx}
            />
            <Button
              color="error"
              variant="outlined"
              className="ml-2 mb-2"
              style={{ borderRadius: "4px" }}
              sx={buttonSx}
              onClick={() => onDeleteItem(index, item)}
            >
              حذف
            </Button>
          </Box>
        ))}

        <Button
          onClick={onAddItem}
          className="ml-2 mb-2"
          style={{ borderRadius: "4px", background: "#386e6e", color: "white" }}
          sx={buttonSx}
        >
          {addLabel}
        </Button>
      </DialogContent>

      <DialogActions sx={{ direction: "rtl" }}>
        <Button onClick={onClose} color="secondary" sx={buttonSx}>
          إغلاق
        </Button>
        <Button onClick={handleSave} color="primary" sx={buttonSx} disabled={isSubmitting}>
          {isSubmitting ? "جاري الحفظ..." : "حفظ"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
