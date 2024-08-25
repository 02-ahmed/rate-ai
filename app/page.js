"use client";
import { useState, useRef, useEffect } from "react";
import {
  Box,
  Container,
  IconButton,
  InputBase,
  Paper,
  Stack,
  ThemeProvider,
  createTheme,
  Typography,
  AppBar,
  Toolbar,
  CircularProgress,
} from "@mui/material";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, SmartToyOutlined } from "@mui/icons-material";

const theme = createTheme({
  palette: {
    primary: {
      main: "#3f51b5",
    },
    background: {
      default: "#f5f5f5",
    },
  },
  typography: {
    fontSize: 14,
  },
});

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Hi! I'm the Rate My Professor support assistant. How can I help you today?`,
    },
  ]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const sendMessage = async () => {
    if (message === "") return;
    setIsLoading(true);
    setMessages((messages) => [
      ...messages,
      { role: "user", content: message },
      { role: "assistant", content: "" },
    ]);
    setMessage("");

    const response = fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify([...messages, { role: "user", content: message }]),
    }).then(async (res) => {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let result = "";
      return reader.read().then(function processText({ done, value }) {
        if (done) {
          setIsLoading(false);
          return result;
        }
        const text = decoder.decode(value || new Uint8Array(), {
          stream: true,
        });
        setMessages((messages) => {
          let lastMessage = messages[messages.length - 1];
          let otherMessages = messages.slice(0, messages.length - 1);
          return [
            ...otherMessages,
            { ...lastMessage, content: lastMessage.content + text },
          ];
        });
        return reader.read().then(processText);
      });
    });
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
        <AppBar position="static" sx={{ mb: 0, boxShadow: 1 }}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              ProFinder
            </Typography>
          </Toolbar>
        </AppBar>
        <Box
          sx={{
            flexGrow: 1,
            overflow: "auto",
            backgroundColor: "background.default",
            padding: 2,
          }}
        >
          <Container maxWidth="sm">
            <Stack direction="column" spacing={2}>
              {messages.map((message, index) => (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    justifyContent:
                      message.role === "assistant" ? "flex-start" : "flex-end",
                    width: "100%",
                  }}
                >
                  <Paper
                    elevation={2}
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      backgroundColor:
                        message.role === "assistant" ? "#ffffff" : "#e3f2fd",
                      maxWidth: "80%",
                    }}
                  >
                    <Markdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </Markdown>
                  </Paper>
                </Box>
              ))}
              {isLoading && (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "flex-start",
                    width: "100%",
                  }}
                >
                  <Paper
                    elevation={2}
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      backgroundColor: "#ffffff",
                      maxWidth: "80%",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <CircularProgress size={20} />
                  </Paper>
                </Box>
              )}
              <div ref={messagesEndRef} />
            </Stack>
          </Container>
        </Box>
        <Box
          sx={{
            backgroundColor: "background.default",
            py: 2,
            boxShadow: "0 -2px 5px rgba(0, 0, 0, 0.1)",
            position: "sticky",
            bottom: 0,
            left: 0,
            right: 0,
          }}
        >
          <Container maxWidth="sm">
            <Paper
              component="form"
              sx={{
                p: "2px 4px",
                display: "flex",
                alignItems: "center",
                width: "100%",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              }}
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
            >
              <InputBase
                sx={{ ml: 1, flex: 1 }}
                placeholder="Type your message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <IconButton
                type="submit"
                sx={{ p: "10px", color: "primary.main" }}
              >
                <Send />
              </IconButton>
            </Paper>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
