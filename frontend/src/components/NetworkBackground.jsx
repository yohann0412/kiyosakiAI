import React, { useRef, useMemo, Suspense, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

function InteractiveNetworkPoints({ mousePos }) {
  const mainRef = useRef()
  const pointsRef = useRef()
  const linesGroupRef = useRef()
  const { viewport } = useThree()
  
  // Generate static network points that cover the whole screen
  const networkData = useMemo(() => {
    const count = 350
    const positions = new Float32Array(count * 3)
    const originalPositions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const colors = new Float32Array(count * 3)
    const connections = []
    
    // Create points in a grid-like pattern with some randomness
    const gridSize = Math.ceil(Math.sqrt(count))
    let pointIndex = 0
    
    for (let i = 0; i < gridSize && pointIndex < count; i++) {
      for (let j = 0; j < gridSize && pointIndex < count; j++) {
        // Spread points across a large area
        const x = (i / (gridSize - 1)) * 90 - 45 + (Math.random() - 0.5) * 10
        const y = (j / (gridSize - 1)) * 60 - 30 + (Math.random() - 0.5) * 10
        const z = (Math.random() - 0.5) * 25
        
        positions[pointIndex * 3] = x
        positions[pointIndex * 3 + 1] = y
        positions[pointIndex * 3 + 2] = z
        
        originalPositions[pointIndex * 3] = x
        originalPositions[pointIndex * 3 + 1] = y
        originalPositions[pointIndex * 3 + 2] = z
        
        // Varied sizes based on depth
        sizes[pointIndex] = 0.15 + Math.random() * 0.1 + (z + 12.5) * 0.004
        
        // Color variation based on position
        const colorIntensity = 0.7 + Math.random() * 0.3
        colors[pointIndex * 3] = 0.3 + colorIntensity * 0.4     // R
        colors[pointIndex * 3 + 1] = 0.4 + colorIntensity * 0.4 // G  
        colors[pointIndex * 3 + 2] = 0.8 + colorIntensity * 0.2 // B
        
        pointIndex++
      }
    }
    
    // Create connections between nearby points
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const dx = positions[i * 3] - positions[j * 3]
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1]
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2]
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
        
        // Only connect nearby points
        if (distance < 15 && Math.random() > 0.75) {
          const baseOpacity = Math.max(0.05, 0.3 - distance * 0.015)
          connections.push({
            start: [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]],
            end: [positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]],
            opacity: baseOpacity,
            originalOpacity: baseOpacity,
            distance: distance
          })
        }
      }
    }
    
    return { positions, originalPositions, sizes, colors, connections, count }
  }, [])

  useFrame((state) => {
    if (mainRef.current) {
      // Gentle rotation
      mainRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.08
      mainRef.current.rotation.y = state.clock.elapsedTime * 0.03
    }
    
    // Mouse interaction effects
    if (pointsRef.current && mousePos) {
      const positions = pointsRef.current.geometry.attributes.position.array
      const sizes = pointsRef.current.geometry.attributes.size.array
      const colors = pointsRef.current.geometry.attributes.color.array
      
      // Convert mouse to world coordinates
      const mouseX = (mousePos.x / window.innerWidth) * 2 - 1
      const mouseY = -(mousePos.y / window.innerHeight) * 2 + 1
      const mouseWorldX = mouseX * viewport.width / 2 * 1.5
      const mouseWorldY = mouseY * viewport.height / 2 * 1.5
      
      for (let i = 0; i < networkData.count; i++) {
        const originalX = networkData.originalPositions[i * 3]
        const originalY = networkData.originalPositions[i * 3 + 1]
        const originalZ = networkData.originalPositions[i * 3 + 2]
        
        // Calculate distance from mouse
        const dx = originalX - mouseWorldX
        const dy = originalY - mouseWorldY
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        const interactionRadius = 12
        
        if (distance < interactionRadius) {
          // Create ripple effect
          const influence = (interactionRadius - distance) / interactionRadius
          const wave = Math.sin(state.clock.elapsedTime * 8 - distance * 0.5) * influence
          
          // Apply wave displacement
          positions[i * 3] = originalX + dx * wave * 0.3
          positions[i * 3 + 1] = originalY + dy * wave * 0.3
          positions[i * 3 + 2] = originalZ + wave * 2
          
          // Enhance size
          sizes[i] = networkData.sizes[i] * (1 + influence * 2)
          
          // Brighten colors
          colors[i * 3] = Math.min(1, networkData.colors[i * 3] + influence * 0.5)
          colors[i * 3 + 1] = Math.min(1, networkData.colors[i * 3 + 1] + influence * 0.3)
          colors[i * 3 + 2] = Math.min(1, networkData.colors[i * 3 + 2] + influence * 0.2)
        } else {
          // Return to original state
          positions[i * 3] = originalX
          positions[i * 3 + 1] = originalY
          positions[i * 3 + 2] = originalZ
          sizes[i] = networkData.sizes[i]
          colors[i * 3] = networkData.colors[i * 3]
          colors[i * 3 + 1] = networkData.colors[i * 3 + 1]
          colors[i * 3 + 2] = networkData.colors[i * 3 + 2]
        }
      }
      
      pointsRef.current.geometry.attributes.position.needsUpdate = true
      pointsRef.current.geometry.attributes.size.needsUpdate = true
      pointsRef.current.geometry.attributes.color.needsUpdate = true
    }
    
    // Animate connection lines
    if (linesGroupRef.current && mousePos) {
      const mouseX = (mousePos.x / window.innerWidth) * 2 - 1
      const mouseY = -(mousePos.y / window.innerHeight) * 2 + 1
      const mouseWorldX = mouseX * viewport.width / 2 * 1.5
      const mouseWorldY = mouseY * viewport.height / 2 * 1.5
      
      linesGroupRef.current.children.forEach((line, index) => {
        const connection = networkData.connections[index]
        if (connection && line.material) {
          // Calculate distance from mouse to line midpoint
          const midX = (connection.start[0] + connection.end[0]) / 2
          const midY = (connection.start[1] + connection.end[1]) / 2
          const distanceToMouse = Math.sqrt(
            Math.pow(midX - mouseWorldX, 2) + Math.pow(midY - mouseWorldY, 2)
          )
          
          if (distanceToMouse < 15) {
            const influence = (15 - distanceToMouse) / 15
            line.material.opacity = connection.originalOpacity * (1 + influence * 3)
          } else {
            line.material.opacity = connection.originalOpacity
          }
        }
      })
    }
  })

  return (
    <group ref={mainRef}>
      {/* Interactive points */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={networkData.count}
            array={networkData.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={networkData.count}
            array={networkData.sizes}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-color"
            count={networkData.count}
            array={networkData.colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.15}
          transparent
          opacity={0.8}
          sizeAttenuation={true}
          vertexColors={true}
        />
      </points>
      
      {/* Connection lines */}
      <group ref={linesGroupRef}>
        {networkData.connections.map((connection, index) => (
          <line key={index}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([...connection.start, ...connection.end])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial
              color={connection.distance < 8 ? "#f6d365" : "#667eea"}
              transparent
              opacity={connection.opacity}
            />
          </line>
        ))}
      </group>
    </group>
  )
}

function FloatingParticles({ mousePos }) {
  const particlesRef = useRef()
  const { viewport } = useThree()
  
  // Enhanced floating particles
  const particleData = useMemo(() => {
    const count = 100
    const positions = new Float32Array(count * 3)
    const originalPositions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const colors = new Float32Array(count * 3)
    
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 120
      const y = (Math.random() - 0.5) * 80
      const z = (Math.random() - 0.5) * 40
      
      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z
      
      originalPositions[i * 3] = x
      originalPositions[i * 3 + 1] = y
      originalPositions[i * 3 + 2] = z
      
      sizes[i] = 0.05 + Math.random() * 0.08
      
      // Golden color variations
      const intensity = 0.8 + Math.random() * 0.2
      colors[i * 3] = 0.9 + intensity * 0.1     // R
      colors[i * 3 + 1] = 0.7 + intensity * 0.3 // G
      colors[i * 3 + 2] = 0.2 + intensity * 0.3 // B
    }
    
    return { positions, originalPositions, sizes, colors, count }
  }, [])

  useFrame((state) => {
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array
      const sizes = particlesRef.current.geometry.attributes.size.array
      const colors = particlesRef.current.geometry.attributes.color.array
      
      // Mouse interaction
      const mouseX = mousePos ? (mousePos.x / window.innerWidth) * 2 - 1 : 0
      const mouseY = mousePos ? -(mousePos.y / window.innerHeight) * 2 + 1 : 0
      const mouseWorldX = mouseX * viewport.width / 2 * 1.5
      const mouseWorldY = mouseY * viewport.height / 2 * 1.5
      
      for (let i = 0; i < particleData.count; i++) {
        const originalX = particleData.originalPositions[i * 3]
        const originalY = particleData.originalPositions[i * 3 + 1]
        const originalZ = particleData.originalPositions[i * 3 + 2]
        
        // Floating motion
        const floatX = Math.sin(state.clock.elapsedTime * 0.5 + i * 0.1) * 0.02
        const floatY = Math.cos(state.clock.elapsedTime * 0.3 + i * 0.1) * 0.02
        const floatZ = Math.sin(state.clock.elapsedTime * 0.7 + i * 0.1) * 0.01
        
        let x = originalX + floatX
        let y = originalY + floatY
        let z = originalZ + floatZ
        let size = particleData.sizes[i]
        let colorR = particleData.colors[i * 3]
        let colorG = particleData.colors[i * 3 + 1]
        let colorB = particleData.colors[i * 3 + 2]
        
        // Mouse attraction
        if (mousePos) {
          const dx = x - mouseWorldX
          const dy = y - mouseWorldY
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance < 20) {
            const attraction = (20 - distance) / 20
            const pullStrength = attraction * 0.5
            
            x -= dx * pullStrength * 0.1
            y -= dy * pullStrength * 0.1
            z += attraction * 3
            
            size *= (1 + attraction * 2)
            colorR = Math.min(1, colorR + attraction * 0.2)
            colorG = Math.min(1, colorG + attraction * 0.1)
            colorB = Math.min(1, colorB + attraction * 0.3)
          }
        }
        
        positions[i * 3] = x
        positions[i * 3 + 1] = y
        positions[i * 3 + 2] = z
        sizes[i] = size
        colors[i * 3] = colorR
        colors[i * 3 + 1] = colorG
        colors[i * 3 + 2] = colorB
      }
      
      particlesRef.current.geometry.attributes.position.needsUpdate = true
      particlesRef.current.geometry.attributes.size.needsUpdate = true
      particlesRef.current.geometry.attributes.color.needsUpdate = true
    }
  })

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleData.count}
          array={particleData.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={particleData.count}
          array={particleData.sizes}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleData.count}
          array={particleData.colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        transparent
        opacity={0.7}
        sizeAttenuation={true}
        vertexColors={true}
      />
    </points>
  )
}

function NetworkBackground() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  
  const handleMouseMove = useCallback((event) => {
    setMousePos({ x: event.clientX, y: event.clientY })
  }, [])
  
  React.useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [handleMouseMove])
  
  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        background: `
          radial-gradient(ellipse at 20% 50%, rgba(102, 126, 234, 0.1) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 20%, rgba(246, 211, 101, 0.08) 0%, transparent 50%),
          radial-gradient(ellipse at 40% 80%, rgba(118, 75, 162, 0.08) 0%, transparent 50%),
          linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)
        `
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 35], fov: 75 }}
        style={{ background: 'transparent' }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.3} />
          <pointLight position={[20, 20, 15]} intensity={0.8} color="#667eea" />
          <pointLight position={[-20, -20, -10]} intensity={0.6} color="#f6d365" />
          <pointLight position={[0, 0, 20]} intensity={0.4} color="#764ba2" />
          
          <InteractiveNetworkPoints mousePos={mousePos} />
          <FloatingParticles mousePos={mousePos} />
        </Suspense>
      </Canvas>
    </div>
  )
}

export default NetworkBackground
