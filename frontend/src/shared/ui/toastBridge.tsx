import {
  setNotificationHandler,
  type ApiNotification,
} from "../api/httpClient";
import { toast } from "react-hot-toast";

setNotificationHandler((n: ApiNotification) => {
  if (n.kind === "success") {
    toast.success(n.message);
  } else if (n.kind === "warning") {
    toast(n.message);
  } else {
    toast.error(n.message);
  }
});
