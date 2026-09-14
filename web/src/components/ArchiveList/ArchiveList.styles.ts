import styled from "styled-components";
import { theme } from "../../styles/theme";

export const List = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${theme.space(3)};
`;
