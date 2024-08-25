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
        <AppBar position="static">
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
                      p: "12px 15px",
                      borderRadius: 3,
                      backgroundColor:
                        message.role === "assistant" ? "#ffffff" : "#e3f2fd",
                      maxWidth: "80%",
                      padding: "25px",
                    }}
                  >
                    {message.role === "assistant" ? (
                      <Box sx={{ lineHeight: "30px" }}>
                        <Markdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </Markdown>
                      </Box>
                    ) : (
                      <Box sx={{ fontSize: "16px" }}>{message.content}</Box>
                    )}
                  </Paper>
                </Box>
              ))}
              {isLoading && (
                <Box sx={{ display: "flex", justifyContent: "center" }}>
                  <CircularProgress />
                </Box>
              )}
              <div ref={messagesEndRef} />
            </Stack>
          </Container>
        </Box>
        <Paper
          component="form"
          sx={{
            p: "4px",
            display: "flex",
            alignItems: "center",
            width: "100%",
            backgroundColor: "#ffffff",
            boxShadow: "0 -2px 10px rgba(0, 0, 0, 0.1)",
          }}
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
        >
          <InputBase
            sx={{
              ml: 1,
              flex: 1,
              fontSize: "16px",
            }}
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <IconButton type="submit" sx={{ p: "10px", color: "primary.main" }}>
            <Send />
          </IconButton>
        </Paper>
      </Box>
    </ThemeProvider>
  );
}
