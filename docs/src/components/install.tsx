import { AnimatedSpan, Terminal, TypingAnimation } from "./terminal";

export const Install = () => {
  return (
    <Terminal sequence={false}>
      <TypingAnimation>{"> npx sidekit init"}</TypingAnimation>
      <AnimatedSpan delay={1300} className="text-gray-400">
        <span>│ </span>
        <span className="text-purple-300">
          ◆ What coding agents do you use?
        </span>
        <span>│ Opencode</span>
      </AnimatedSpan>
      <AnimatedSpan delay={1800} className="text-gray-400">
        <span>│ </span>
        <span className="text-purple-300">
          ◆ What presets do you want to configure?
        </span>
        <span>│ NextJS, Clerk, Prisma</span>
      </AnimatedSpan>
      <AnimatedSpan delay={2300} className="text-gray-400">
        <span>│ </span>
        <span className="text-purple-500">▼ Generating project</span>
      </AnimatedSpan>
      <AnimatedSpan delay={3000} className="text-green-500">
        <span> </span>
        <span>✔ Generated 28 rules</span>
      </AnimatedSpan>
      <AnimatedSpan delay={3400} className="text-green-500">
        <span>✔ Configured 2 MCP servers</span>
      </AnimatedSpan>
      <AnimatedSpan delay={3800} className="text-green-500">
        <span>✔ 78 entries added to search database</span>
      </AnimatedSpan>
    </Terminal>
  );
};
