# API Integration Documentation

This document describes the integration between the frontend Kahoot application and the backend API based on the provided Swagger JSON specification.

## Overview

The frontend has been updated to integrate with the backend API endpoints for Games, Questions, and Answers. The integration includes:

- TypeScript types based on Swagger schemas
- API client functions for all endpoints
- React hooks for data fetching and mutations
- Type converters between frontend and API formats
- Updated components to use the new API integration

## File Structure

### Types
- `src/types/api.ts` - TypeScript interfaces based on Swagger schemas
- `src/types/game.ts` - Updated frontend-specific types

### API Client
- `src/lib/api-client.ts` - Core API client with all endpoint functions
- `src/lib/type-converters.ts` - Utility functions to convert between frontend and API types

### React Hooks
- `src/hooks/useGames.ts` - Hooks for Games API operations
- `src/hooks/useQuestions.ts` - Hooks for Questions API operations
- `src/hooks/useAnswers.ts` - Hooks for Answers API operations

### Components
- `src/components/admin/CreateGameModal.tsx` - Modal for creating new games
- Updated admin dashboard and question creation pages

## API Endpoints Integration

### Games API
- `GET /api/Games` - List games with pagination and filtering
- `POST /api/Games` - Create new game
- `GET /api/Games/{id}` - Get specific game
- `PATCH /api/Games/{id}` - Update game
- `DELETE /api/Games/{id}` - Delete game
- `PATCH /api/Games/{id}/state` - Update game state

### Questions API
- `GET /api/games/{gameId}/Questions` - List questions for a game
- `POST /api/games/{gameId}/Questions` - Create new question
- `GET /api/games/{gameId}/Questions/{id}` - Get specific question
- `PATCH /api/games/{gameId}/Questions/{id}` - Update question
- `DELETE /api/games/{gameId}/Questions/{id}` - Delete question

### Answers API
- `GET /api/games/{gameId}/questions/{questionId}/Answers` - List answers for a question
- `GET /api/games/{gameId}/questions/{questionId}/Answers/{Id}` - Get specific answer
- `POST /api/games/{gameId}/questions/{questionId}/Answers/create` - Create answers
- `PATCH /api/games/{gameId}/questions/{questionId}/Answers` - Update answers
- `POST /api/games/{gameId}/questions/{questionId}/Answers/delete` - Delete answers
- `DELETE /api/games/{gameId}/questions/{questionId}/Answers/{id}` - Delete specific answer

## Usage Examples

### Using Games API

```typescript
import { useGames, useGameMutations } from '@/hooks/useGames';

function GamesList() {
  const { games, loading, error, refetch } = useGames({
    skip: 0,
    take: 10,
    state: GameState.Ready
  });

  const { createGame, updateGame, deleteGame } = useGameMutations();

  const handleCreateGame = async () => {
    try {
      await createGame({
        title: 'New Game',
        description: 'Game description',
        userNTID: 'user-id'
      });
      refetch();
    } catch (error) {
      console.error('Failed to create game:', error);
    }
  };

  return (
    <div>
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      {games?.map(game => (
        <div key={game.id}>{game.title}</div>
      ))}
    </div>
  );
}
```

### Using Questions API

```typescript
import { useQuestions, useQuestionMutations } from '@/hooks/useQuestions';

function QuestionsList({ gameId }: { gameId: string }) {
  const { questions, loading, error, refetch } = useQuestions(gameId);
  const { createQuestion, updateQuestion, deleteQuestion } = useQuestionMutations();

  const handleCreateQuestion = async () => {
    try {
      await createQuestion(gameId, {
        gameId,
        title: 'New Question',
        timeLimitSeconds: 30,
        type: QuestionType.SingleChoice,
        userNTID: 'user-id'
      });
      refetch();
    } catch (error) {
      console.error('Failed to create question:', error);
    }
  };

  return (
    <div>
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      {questions?.map(question => (
        <div key={question.id}>{question.title}</div>
      ))}
    </div>
  );
}
```

### Using Answers API

```typescript
import { useAnswers, useAnswerMutations } from '@/hooks/useAnswers';

function AnswersList({ gameId, questionId }: { gameId: string; questionId: string }) {
  const { answers, loading, error, refetch } = useAnswers(gameId, questionId);
  const { createAnswers, updateAnswers, deleteAnswers } = useAnswerMutations();

  const handleCreateAnswers = async () => {
    try {
      await createAnswers(gameId, questionId, {
        gameId,
        questionId,
        questionType: QuestionType.SingleChoice,
        answers: [
          { title: 'Answer 1', isCorrect: false },
          { title: 'Answer 2', isCorrect: true }
        ],
        userNTID: 'user-id'
      });
      refetch();
    } catch (error) {
      console.error('Failed to create answers:', error);
    }
  };

  return (
    <div>
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      {answers?.map(answer => (
        <div key={answer.id}>{answer.title}</div>
      ))}
    </div>
  );
}
```

## Configuration

### Environment Variables

Set the following environment variable to configure the API base URL:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

### User Authentication

The API requires a `userNTID` field for most operations. Currently, this is hardcoded as `'current-user-id'` in the components. In a production application, this should be:

1. Retrieved from an authentication context
2. Stored in a secure way (e.g., JWT token)
3. Automatically included in API requests

## Type Conversion

The application includes type converters to bridge the gap between frontend UI types and API types:

- `convertApiAnswerToGameAnswer()` - Convert API Answer to frontend GameAnswer
- `convertApiQuestionToGameQuestion()` - Convert API Question to frontend GameQuestion
- `convertGameAnswerToApiAnswer()` - Convert frontend GameAnswer to API Answer
- `convertGameQuestionToApiQuestion()` - Convert frontend GameQuestion to API Question

## Error Handling

All API operations include comprehensive error handling:

- Network errors are caught and displayed to users
- Validation errors are shown with specific field information
- Loading states are managed for better UX
- Error messages are user-friendly

## Future Improvements

1. **Authentication Integration**: Implement proper user authentication and authorization
2. **Real-time Updates**: Add WebSocket support for real-time game updates
3. **Caching**: Implement React Query or SWR for better data caching
4. **Optimistic Updates**: Add optimistic updates for better perceived performance
5. **Error Boundaries**: Implement React Error Boundaries for better error handling
6. **Testing**: Add comprehensive unit and integration tests
7. **Type Safety**: Improve type safety with stricter TypeScript configurations

## Testing the Integration

To test the API integration:

1. Start your backend API server
2. Set the `NEXT_PUBLIC_API_BASE_URL` environment variable
3. Run the frontend application: `npm run dev`
4. Navigate to the admin dashboard to test game creation
5. Create questions and answers to test the full flow

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure your backend API has proper CORS configuration
2. **Network Errors**: Check that the API base URL is correct and the server is running
3. **Type Errors**: Ensure all required fields are provided in API requests
4. **Authentication Errors**: Verify that userNTID is properly set

### Debug Mode

Enable debug logging by adding console.log statements in the API client functions or using browser dev tools to inspect network requests.
